import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, FileText, ChevronLeft, Pencil, Plug } from 'lucide-react'
import type { Site, Post } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ siteId: string }>
}

export default async function SitePage({ params }: Props) {
  const { siteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: siteData } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .single()

  const site = siteData as Site | null
  if (!site) notFound()

  const { data: postsData } = await supabase
    .from('posts')
    .select('id, title, slug, status, created_at, updated_at')
    .eq('site_id', siteId)
    .order('updated_at', { ascending: false })

  const posts = (postsData ?? []) as Pick<Post, 'id' | 'title' | 'slug' | 'status' | 'created_at' | 'updated_at'>[]

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-neutral-400 hover:text-neutral-600 flex items-center gap-1 mb-4"
        >
          <ChevronLeft size={14} /> Todos os sites
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
            <p className="text-sm text-neutral-400 mt-0.5">{site.domain}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/sites/${siteId}/integration`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Plug size={15} />
                Integração
              </Button>
            </Link>
            <Link href={`/sites/${siteId}/posts/new`}>
              <Button size="sm" className="gap-2">
                <Plus size={15} />
                Novo Post
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Lista de posts */}
      {posts.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <FileText size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Nenhum post criado ainda.</p>
          <p className="text-sm mt-1">
            <Link href={`/sites/${siteId}/posts/new`} className="underline">
              Criar primeiro post
            </Link>
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden bg-white">
          {posts.map(post => (
            <Link
              key={post.id}
              href={`/sites/${siteId}/posts/${post.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {post.title || <span className="text-neutral-400 italic">Sem título</span>}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">/{post.slug || '—'}</p>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <Badge
                  variant={post.status === 'published' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {post.status === 'published' ? 'Publicado' : 'Rascunho'}
                </Badge>
                <span className="text-xs text-neutral-400">
                  {new Date(post.updated_at).toLocaleDateString('pt-BR')}
                </span>
                <Pencil size={13} className="text-neutral-300 group-hover:text-neutral-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
