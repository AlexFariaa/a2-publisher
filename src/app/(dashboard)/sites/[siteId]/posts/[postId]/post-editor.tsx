'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Post, Site, WpTaxonomyItem } from '@/lib/supabase/types'
import { TipTapEditor } from '@/components/editor/tiptap-editor'
import { TableOfContents } from '@/components/editor/table-of-contents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ChevronLeft, Upload, AlertCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { JSONContent } from '@tiptap/react'

interface PostEditorProps {
  post: Post
  site: Site
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function getSeoWarnings(post: Partial<Post>, content: JSONContent | null): string[] {
  const warnings: string[] = []
  if (!post.title?.trim()) warnings.push('Título (H1) obrigatório')
  if (!post.cover_image) warnings.push('Foto de capa ausente')
  if (!post.seo_description?.trim()) warnings.push('Meta description ausente')
  if (!post.slug?.trim()) warnings.push('Slug (URL) obrigatório')
  // Verifica imagens sem alt text no content
  const contentStr = JSON.stringify(content ?? {})
  if (contentStr.includes('"type":"image"') && !contentStr.includes('"alt"')) {
    warnings.push('Há imagens sem texto alternativo (alt)')
  }
  return warnings
}

export function PostEditor({ post: initialPost, site }: PostEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const [post, setPost] = useState(initialPost)
  const [content, setContent] = useState<JSONContent | null>(
    initialPost.content as JSONContent | null
  )
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [slugEdited, setSlugEdited] = useState(!!initialPost.slug)
  const [uploadingCover, setUploadingCover] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // WordPress taxonomies state
  const [wpCategories, setWpCategories] = useState<WpTaxonomyItem[]>([])
  const [wpTags, setWpTags] = useState<WpTaxonomyItem[]>([])
  const [loadingTaxonomies, setLoadingTaxonomies] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    initialPost.wp_metadata?.category_ids ?? []
  )
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    initialPost.wp_metadata?.tag_ids ?? []
  )

  const warnings = getSeoWarnings(post, content)

  // Carrega categorias e tags do WordPress
  useEffect(() => {
    if (site.platform !== 'wordpress') return

    async function loadTaxonomies() {
      setLoadingTaxonomies(true)
      const [catRes, tagRes] = await Promise.all([
        fetch(`/api/wordpress-taxonomies?siteId=${site.id}&type=categories`),
        fetch(`/api/wordpress-taxonomies?siteId=${site.id}&type=tags`),
      ])

      if (catRes.ok) {
        const { items } = await catRes.json() as { items: WpTaxonomyItem[] }
        setWpCategories(items)
      }
      if (tagRes.ok) {
        const { items } = await tagRes.json() as { items: WpTaxonomyItem[] }
        setWpTags(items)
      }
      setLoadingTaxonomies(false)
    }

    loadTaxonomies()
  }, [site.id, site.platform])

  // Auto-save com debounce
  const autoSave = useCallback(async (
    data: Partial<Post>,
    contentData: JSONContent | null,
    catIds: number[],
    tagIds: number[],
  ) => {
    setSaving(true)
    const { error } = await supabase
      .from('posts')
      .update({
        ...data,
        content: contentData as Post['content'],
        status: 'draft',
        wp_metadata: site.platform === 'wordpress'
          ? { category_ids: catIds, tag_ids: tagIds }
          : null,
      })
      .eq('id', post.id)

    setSaving(false)
    if (error) toast.error('Erro ao salvar rascunho')
  }, [post.id, supabase, site.platform])

  function scheduleAutoSave(
    data: Partial<Post>,
    contentData: JSONContent | null,
    catIds = selectedCategoryIds,
    tagIds = selectedTagIds,
  ) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => autoSave(data, contentData, catIds, tagIds), 1500)
  }

  function handleTitleChange(title: string) {
    const updated = { ...post, title }
    if (!slugEdited) updated.slug = generateSlug(title)
    setPost(updated)
    scheduleAutoSave(updated, content)
  }

  function handleSlugChange(slug: string) {
    setSlugEdited(true)
    const updated = { ...post, slug }
    setPost(updated)
    scheduleAutoSave(updated, content)
  }

  function handleContentChange(newContent: JSONContent) {
    setContent(newContent)
    scheduleAutoSave(post, newContent)
  }

  function handleFieldChange(field: keyof Post, value: string) {
    const updated = { ...post, [field]: value }
    setPost(updated)
    scheduleAutoSave(updated, content)
  }

  function toggleCategory(id: number) {
    const next = selectedCategoryIds.includes(id)
      ? selectedCategoryIds.filter(c => c !== id)
      : [...selectedCategoryIds, id]
    setSelectedCategoryIds(next)
    scheduleAutoSave(post, content, next, selectedTagIds)
  }

  function toggleTag(id: number) {
    const next = selectedTagIds.includes(id)
      ? selectedTagIds.filter(t => t !== id)
      : [...selectedTagIds, id]
    setSelectedTagIds(next)
    scheduleAutoSave(post, content, selectedCategoryIds, next)
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    const ext = file.name.split('.').pop()
    const path = `${post.id}/cover.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Erro ao fazer upload da imagem')
      setUploadingCover(false)
      return
    }

    const { data } = supabase.storage.from('post-images').getPublicUrl(path)
    const updated = { ...post, cover_image: data.publicUrl }
    setPost(updated)
    scheduleAutoSave(updated, content)
    setUploadingCover(false)
    toast.success('Capa enviada!')
  }

  const [deletingPost, setDeletingPost] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    setDeletingPost(true)
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) {
      toast.error('Erro ao deletar post')
      setDeletingPost(false)
      setConfirmDelete(false)
      return
    }
    toast.success('Post deletado')
    router.push(`/sites/${site.id}`)
  }

  async function handlePublish() {
    if (warnings.length > 0) {
      toast.error('Corrija os alertas de SEO antes de publicar')
      return
    }

    setPublishing(true)

    // Cancela auto-save pendente e força salvar antes de publicar
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current)
      await autoSave(post, content, selectedCategoryIds, selectedTagIds)
    }

    if (site.platform === 'wordpress') {
      // Publicação via WP REST API (server-side para proteger credenciais)
      const res = await fetch('/api/publish-wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          categoryIds: selectedCategoryIds,
          tagIds: selectedTagIds,
        }),
      })

      setPublishing(false)

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        toast.error(data.error ?? 'Erro ao publicar no WordPress')
        return
      }

      setPost(p => ({ ...p, status: 'published' }))
      toast.success('Post publicado no WordPress!')
      return
    }

    // Publicação Supabase (lógica original)
    const { error } = await supabase
      .from('posts')
      .update({
        title: post.title,
        slug: post.slug,
        content: content as Post['content'],
        cover_image: post.cover_image,
        seo_description: post.seo_description,
        status: 'published',
      })
      .eq('id', post.id)

    setPublishing(false)

    if (error) {
      toast.error('Erro ao publicar')
      return
    }

    setPost(p => ({ ...p, status: 'published' }))
    toast.success('Post publicado com sucesso!')
  }

  async function handleUnpublish() {
    const { error } = await supabase
      .from('posts')
      .update({ status: 'draft' })
      .eq('id', post.id)

    if (!error) {
      setPost(p => ({ ...p, status: 'draft' }))
      toast.success('Post voltou para rascunho')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/sites/${site.id}`}
            className="text-sm text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
          >
            <ChevronLeft size={14} /> {site.name}
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
              {post.status === 'published' ? 'Publicado' : 'Rascunho'}
            </Badge>
            {saving && (
              <span className="text-xs text-neutral-400">Salvando...</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-xs text-neutral-500">Deletar este post?</span>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deletingPost}>
                {deletingPost ? 'Deletando...' : 'Sim, deletar'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-neutral-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 size={14} />
              </Button>
              {post.status === 'published' ? (
                <Button variant="outline" size="sm" onClick={handleUnpublish}>
                  Voltar para Rascunho
                </Button>
              ) : (
                <Button size="sm" onClick={handlePublish} disabled={publishing}>
                  {publishing ? 'Publicando...' : 'Publicar'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-6">
        {/* Coluna principal */}
        <div className="space-y-5">
          {/* Título */}
          <div>
            <input
              type="text"
              placeholder="Título do post"
              value={post.title}
              onChange={e => handleTitleChange(e.target.value)}
              className="w-full text-3xl font-bold tracking-tight border-none outline-none bg-transparent placeholder:text-neutral-300 resize-none"
            />
          </div>

          {/* Editor */}
          <TipTapEditor content={content} onChange={handleContentChange} />
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Alertas SEO */}
          {warnings.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                <AlertCircle size={13} /> Alertas de SEO
              </p>
              <ul className="space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* WordPress: Categorias e Tags */}
          {site.platform === 'wordpress' && (
            <div className="border border-neutral-200 rounded-lg bg-white p-4 space-y-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                WordPress
              </p>

              {loadingTaxonomies ? (
                <p className="text-xs text-neutral-400">Carregando categorias e tags...</p>
              ) : (
                <>
                  {/* Categorias */}
                  <div className="space-y-2">
                    <Label className="text-xs">Categorias</Label>
                    {wpCategories.length === 0 ? (
                      <p className="text-xs text-neutral-400">Nenhuma categoria encontrada</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {wpCategories.map(cat => (
                          <label key={cat.id} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.includes(cat.id)}
                              onChange={() => toggleCategory(cat.id)}
                              className="rounded border-neutral-300 text-neutral-800 focus:ring-neutral-400"
                            />
                            <span className="text-xs text-neutral-700 group-hover:text-neutral-900">
                              {cat.name}
                            </span>
                            <span className="text-xs text-neutral-400">({cat.count})</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="text-xs">Tags</Label>
                    {wpTags.length === 0 ? (
                      <p className="text-xs text-neutral-400">Nenhuma tag encontrada</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                        {wpTags.map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                              selectedTagIds.includes(tag.id)
                                ? 'bg-neutral-800 text-white border-neutral-800'
                                : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-500'
                            }`}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Capa */}
          <div className="border border-neutral-200 rounded-lg bg-white p-4 space-y-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Foto de Capa
            </p>
            {post.cover_image ? (
              <div className="space-y-2">
                <img
                  src={post.cover_image}
                  alt="Capa"
                  className="w-full h-32 object-cover rounded-md"
                />
                <label className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1">
                  <Upload size={12} /> Trocar imagem
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                </label>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center h-24 border-2 border-dashed border-neutral-200 rounded-md hover:border-neutral-400 transition-colors text-neutral-400">
                {uploadingCover ? (
                  <span className="text-xs">Enviando...</span>
                ) : (
                  <>
                    <Upload size={20} />
                    <span className="text-xs mt-1">Clique para enviar</span>
                    <span className="text-xs mt-0.5 text-neutral-300">1200 × 630 px recomendado</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </label>
            )}
          </div>

          {/* SEO */}
          <div className="border border-neutral-200 rounded-lg bg-white p-4 space-y-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">SEO</p>

            <div className="space-y-1.5">
              <Label className="text-xs">Slug (URL)</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-400">/</span>
                <Input
                  value={post.slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  className="text-xs h-8"
                  placeholder="url-do-post"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Meta Description</Label>
              <textarea
                value={post.seo_description ?? ''}
                onChange={e => handleFieldChange('seo_description', e.target.value)}
                placeholder="Descrição para mecanismos de busca..."
                rows={3}
                maxLength={160}
                className="w-full text-xs border border-neutral-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
              <p className="text-xs text-neutral-400 text-right">
                {(post.seo_description ?? '').length}/160
              </p>
            </div>
          </div>

          {/* Índice */}
          <TableOfContents content={content} />
        </div>
      </div>
    </div>
  )
}
