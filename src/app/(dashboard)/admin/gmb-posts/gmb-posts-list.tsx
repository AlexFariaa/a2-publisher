'use client'

import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GmbPost } from '@/lib/supabase/types'

interface GmbPostsListProps {
  posts: GmbPost[]
}

type StatusFilter = 'todos' | 'recebido' | 'publicado'

const FORMAT_LABELS: Record<GmbPost['format'], string> = {
  dica: 'Dica',
  dado: 'Dado',
  pergunta: 'Pergunta',
  cta: 'CTA',
  mito: 'Mito',
  bastidores: 'Bastidores',
}

const FORMAT_COLORS: Record<GmbPost['format'], string> = {
  dica: 'bg-blue-100 text-blue-700',
  dado: 'bg-purple-100 text-purple-700',
  pergunta: 'bg-yellow-100 text-yellow-700',
  cta: 'bg-green-100 text-green-700',
  mito: 'bg-red-100 text-red-700',
  bastidores: 'bg-orange-100 text-orange-700',
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'publicado', label: 'Publicado' },
]

export function GmbPostsList({ posts }: GmbPostsListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [clientFilter, setClientFilter] = useState<string>('todos')

  const clientNames = useMemo(() => {
    const names = Array.from(new Set(posts.map(p => p.client_name))).sort()
    return names
  }, [posts])

  const filtered = useMemo(() => {
    return posts.filter(p => {
      if (statusFilter !== 'todos' && p.status !== statusFilter) return false
      if (clientFilter !== 'todos' && p.client_name !== clientFilter) return false
      return true
    })
  }, [posts, statusFilter, clientFilter])

  // Group by client_name preserving order (first occurrence wins sort)
  const grouped = useMemo(() => {
    const map = new Map<string, GmbPost[]>()
    for (const post of filtered) {
      const list = map.get(post.client_name) ?? []
      list.push(post)
      map.set(post.client_name, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  if (posts.length === 0) {
    return (
      <div className="text-center py-20 text-neutral-400">
        <FileText size={40} className="mx-auto mb-4 opacity-30" />
        <p className="text-sm">Nenhum artigo GMB recebido ainda.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 rounded-md p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                statusFilter === tab.value
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Client filter */}
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="text-sm border border-neutral-200 rounded-md px-3 py-2 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
        >
          <option value="todos">Todos os clientes</option>
          {clientNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <span className="text-xs text-neutral-400 ml-auto">
          {filtered.length} {filtered.length === 1 ? 'artigo' : 'artigos'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-10">
          Nenhum artigo encontrado para os filtros selecionados.
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([clientName, clientPosts]) => (
            <div key={clientName}>
              {/* Client section header */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-neutral-700">{clientName}</h2>
                <span className="text-xs text-neutral-400">{clientPosts.length} {clientPosts.length === 1 ? 'artigo' : 'artigos'}</span>
                <div className="flex-1 h-px bg-neutral-100" />
              </div>

              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden bg-white">
                {clientPosts.map(post => (
                  <div key={post.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                              FORMAT_COLORS[post.format],
                            )}
                          >
                            {FORMAT_LABELS[post.format]}
                          </span>
                          <p className="text-sm font-medium text-neutral-900 truncate">{post.title}</p>
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{post.body}</p>
                        {post.hashtags.length > 0 && (
                          <p className="text-xs text-neutral-400 mt-1.5 truncate">
                            {post.hashtags.map(h => `#${h}`).join(' ')}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge
                          variant={post.status === 'publicado' ? 'default' : 'secondary'}
                          className="text-xs capitalize"
                        >
                          {post.status}
                        </Badge>
                        <span className="text-xs text-neutral-400">
                          {new Date(post.generated_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
