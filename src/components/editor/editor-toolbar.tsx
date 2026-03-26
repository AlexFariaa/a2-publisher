'use client'

import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Link as LinkIcon, Image as ImageIcon, Minus, Quote, Loader2
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  title?: string
}

function ToolbarButton({ onClick, active, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded-md transition-colors text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100',
        active && 'bg-neutral-100 text-neutral-900',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const [altText, setAltText] = useState('')
  const [imageTitle, setImageTitle] = useState('')

  if (!editor) return null

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `inline/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('post-images')
      .upload(path, file, { upsert: false })

    if (error) {
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('post-images').getPublicUrl(path)
    setUploading(false)
    setPendingImageUrl(data.publicUrl)
    setAltText('')
    setImageTitle('')
    // Limpa o input para permitir re-upload do mesmo arquivo
    e.target.value = ''
  }

  function handleInsertImage() {
    if (!pendingImageUrl || !editor) return
    editor.chain().focus().setImage({
      src: pendingImageUrl,
      alt: altText,
      ...(imageTitle ? { title: imageTitle } : {}),
    }).run()
    setPendingImageUrl(null)
    setAltText('')
    setImageTitle('')
  }

  function handleCancelImage() {
    setPendingImageUrl(null)
    setAltText('')
    setImageTitle('')
  }

  function setLink() {
    const url = window.prompt('URL do link:')
    if (url === null) return
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  return (
    <div className="flex flex-col border-b border-neutral-200">
    <div className="flex items-center gap-0.5 px-3 py-2 flex-wrap">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Negrito"
      >
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Itálico"
      >
        <Italic size={15} />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Título H2"
      >
        <Heading2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Título H3"
      >
        <Heading3 size={15} />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Lista"
      >
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Lista numerada"
      >
        <ListOrdered size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Citação"
      >
        <Quote size={15} />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Link">
        <LinkIcon size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Inserir imagem"
      >
        {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divisor"
      >
        <Minus size={15} />
      </ToolbarButton>
    </div>

    {pendingImageUrl && (
      <div className="px-3 pb-3 pt-2 flex flex-col gap-2 bg-neutral-50 border-t border-neutral-100">
        <p className="text-xs text-neutral-500 font-medium">Atributos da imagem</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Alt text (obrigatório para SEO)"
            value={altText}
            onChange={e => setAltText(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleInsertImage()}
            className="flex-1 text-xs border border-neutral-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white"
          />
          <input
            type="text"
            placeholder="Title (opcional)"
            value={imageTitle}
            onChange={e => setImageTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInsertImage()}
            className="flex-1 text-xs border border-neutral-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white"
          />
          <button
            onClick={handleInsertImage}
            className="text-xs px-3 py-1.5 bg-neutral-900 text-white rounded hover:bg-neutral-700 shrink-0"
          >
            Inserir
          </button>
          <button
            onClick={handleCancelImage}
            className="text-xs px-2 py-1.5 text-neutral-400 hover:text-neutral-600 shrink-0"
          >
            Cancelar
          </button>
        </div>
      </div>
    )}
    </div>
  )
}
