'use client'

import { useMemo, useState } from 'react'
import { Search, Globe } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type SiteRow = {
  id: string
  name: string
  domain: string
  postCount: number
  ownerName: string
}

interface SitesListProps {
  sites: SiteRow[]
}

export function SitesList({ sites }: SitesListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sites
    return sites.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.domain.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q)
    )
  }, [sites, query])

  return (
    <div>
      <div className="relative mb-4">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <Input
          className="pl-8"
          placeholder="Buscar por nome, domínio ou cliente..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <Globe size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Nenhum site cadastrado ainda.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-10">
          Nenhum resultado para &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden bg-white">
          {filtered.map(site => (
            <div key={site.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium">{site.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{site.domain}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500">{site.ownerName}</span>
                <Badge variant="secondary" className="text-xs">
                  {site.postCount} posts
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
