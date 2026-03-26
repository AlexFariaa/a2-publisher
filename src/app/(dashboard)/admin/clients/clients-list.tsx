'use client'

import { useMemo, useState } from 'react'
import { Search, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type ClientRow = {
  id: string
  full_name: string | null
  email: string
  site_count: number
  created_at: string
}

interface ClientsListProps {
  clients: ClientRow[]
}

export function ClientsList({ clients }: ClientsListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c =>
      (c.full_name ?? '').toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  }, [clients, query])

  return (
    <div>
      <div className="relative mb-4">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <Input
          className="pl-8"
          placeholder="Buscar por nome ou email..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <User size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-10">
          Nenhum resultado para &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden bg-white">
          {filtered.map(client => (
            <div key={client.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium">{client.full_name ?? '—'}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{client.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">
                  {client.site_count} sites
                </Badge>
                <span className="text-xs text-neutral-400">
                  {new Date(client.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
