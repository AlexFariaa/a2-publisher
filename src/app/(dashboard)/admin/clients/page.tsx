import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import { NewClientDialog } from './new-client-dialog'
import type { Profile } from '@/lib/supabase/types'

type ClientRow = Profile & { site_count: number }

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if ((myProfile as Profile | null)?.role !== 'admin') redirect('/')

  // Busca clientes e sites separadamente para evitar problemas de tipos com join+count
  const { data: clientProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'user')
    .order('created_at', { ascending: false })

  const { data: sites } = await supabase
    .from('sites')
    .select('user_id')

  const clients: ClientRow[] = ((clientProfiles ?? []) as Profile[]).map(c => ({
    ...c,
    site_count: (sites ?? []).filter(s => s.user_id === c.id).length,
  }))

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-neutral-500 mt-1">Gerencie os clientes e seus acessos</p>
        </div>
        <NewClientDialog />
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <User size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden bg-white">
          {clients.map(client => (
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
