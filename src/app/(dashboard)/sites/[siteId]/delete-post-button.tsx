'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeletePostButtonProps {
  postId: string
  postTitle: string
}

export function DeletePostButton({ postId, postTitle }: DeletePostButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirming(true)
  }

  async function handleConfirm(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)

    const supabase = createClient()
    const { error } = await supabase.from('posts').delete().eq('id', postId)

    if (error) {
      toast.error('Erro ao deletar post')
      setDeleting(false)
      setConfirming(false)
      return
    }

    toast.success('Post deletado')
    router.refresh()
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div
        className="flex items-center gap-1.5"
        onClick={e => { e.preventDefault(); e.stopPropagation() }}
      >
        <span className="text-xs text-neutral-500 whitespace-nowrap">Deletar "{postTitle || 'este post'}"?</span>
        <button
          onClick={handleConfirm}
          disabled={deleting}
          className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
        >
          {deleting ? 'Deletando...' : 'Sim'}
        </button>
        <button
          onClick={handleCancel}
          className="text-xs text-neutral-400 hover:text-neutral-600 px-2 py-0.5 rounded hover:bg-neutral-100 transition-colors"
        >
          Não
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="p-1 rounded text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
      title="Deletar post"
    >
      <Trash2 size={13} />
    </button>
  )
}
