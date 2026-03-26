'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DeletePostButton } from './delete-post-button'
import type { Post } from '@/lib/supabase/types'

type PostRow = Pick<Post, 'id' | 'title' | 'slug' | 'status' | 'published_at' | 'created_at' | 'updated_at'>
type PostDisplayStatus = 'all' | 'draft' | 'published' | 'scheduled'

function classifyPost(post: PostRow): 'draft' | 'published' | 'scheduled' {
  if (post.status === 'draft') return 'draft'
  if (post.published_at && new Date(post.published_at) > new Date()) return 'scheduled'
  return 'published'
}

function getDisplayDate(post: PostRow): Date {
  return post.published_at ? new Date(post.published_at) : new Date(post.updated_at)
}

interface PostsListProps {
  posts: PostRow[]
  siteId: string
}

const STATUS_TABS: { value: PostDisplayStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'published', label: 'Publicado' },
  { value: 'scheduled', label: 'Agendado' },
]

export function PostsList({ posts, siteId }: PostsListProps) {
  const [statusFilter, setStatusFilter] = useState<PostDisplayStatus>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const analytics = useMemo(() => {
    let published = 0, scheduled = 0
    for (const post of posts) {
      const s = classifyPost(post)
      if (s === 'published') published++
      else if (s === 'scheduled') scheduled++
    }
    return { total: posts.length, published, scheduled }
  }, [posts])

  const filtered = useMemo(() => {
    return posts.filter(post => {
      if (statusFilter !== 'all' && classifyPost(post) !== statusFilter) return false
      const d = getDisplayDate(post)
      if (dateFrom) {
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        if (d < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (d > to) return false
      }
      return true
    })
  }, [posts, statusFilter, dateFrom, dateTo])

  if (posts.length === 0) {
    return (
      <div className="text-center py-20 text-neutral-400">
        <FileText size={40} className="mx-auto mb-4 opacity-30" />
        <p className="text-sm">Nenhum post criado ainda.</p>
        <p className="text-sm mt-1">
          <Link href={`/sites/${siteId}/posts/new`} className="underline">
            Criar primeiro post
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Status tabs */}
      <div className="flex items-center gap-1.5 mb-3">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1 text-xs rounded-md border transition-colors ${
              statusFilter === tab.value
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'text-neutral-600 border-neutral-200 hover:border-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range + analytics */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">De</span>
          <Input
            type="date"
            className="w-36"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-xs text-neutral-500">Até</span>
          <Input
            type="date"
            className="w-36"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 shrink-0">
          <span>{analytics.total} posts</span>
          <span className="text-neutral-300">·</span>
          <span>{analytics.published} publicados</span>
          <span className="text-neutral-300">·</span>
          <span>{analytics.scheduled} agendados</span>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-10">
          Nenhum post encontrado com esses filtros.
        </p>
      ) : (
        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden bg-white">
          {filtered.map(post => {
            const displayStatus = classifyPost(post)
            const badgeVariant =
              displayStatus === 'scheduled' ? 'outline' :
              displayStatus === 'published' ? 'default' : 'secondary'
            const badgeLabel =
              displayStatus === 'scheduled' ? 'Agendado' :
              displayStatus === 'published' ? 'Publicado' : 'Rascunho'

            return (
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
                  <Badge variant={badgeVariant} className="text-xs">
                    {badgeLabel}
                  </Badge>
                  <span className="text-xs text-neutral-400">
                    {getDisplayDate(post).toLocaleDateString('pt-BR')}
                  </span>
                  <Pencil size={13} className="text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                  <DeletePostButton postId={post.id} postTitle={post.title} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
