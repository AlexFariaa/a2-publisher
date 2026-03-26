'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { useEffect, useCallback } from 'react'
import { EditorToolbar } from './editor-toolbar'

interface TipTapEditorProps {
  content: object | null
  onChange: (content: object) => void
  editable?: boolean
}

export function TipTapEditor({ content, onChange, editable = true }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full my-4' },
      }),
      Placeholder.configure({
        placeholder: 'Comece a escrever seu post...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline' },
      }),
    ],
    immediatelyRender: false,
    content: content ?? undefined,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content prose max-w-none focus:outline-none min-h-[400px] px-1',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getJSON())
    },
  })

  // Sincroniza conteúdo externo (ex: carregamento inicial)
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza editabilidade quando o prop muda
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  return (
    <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
      <EditorToolbar editor={editor} />
      <div className="px-6 py-5">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
