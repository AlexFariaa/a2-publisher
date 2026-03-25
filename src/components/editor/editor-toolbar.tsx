'use client'

import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Link as LinkIcon, Image as ImageIcon, Minus, Quote
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

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
  if (!editor) return null

  function addImage() {
    const url = window.prompt('URL da imagem:')
    if (url) editor!.chain().focus().setImage({ src: url }).run()
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
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-neutral-200 flex-wrap">
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
      <ToolbarButton onClick={addImage} title="Inserir imagem por URL">
        <ImageIcon size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divisor"
      >
        <Minus size={15} />
      </ToolbarButton>
    </div>
  )
}
