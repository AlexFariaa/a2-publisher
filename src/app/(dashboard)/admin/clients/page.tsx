import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewClientDialog } from './new-client-dialog'
import { ClientsList } from './clients-list'
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

      <ClientsList clients={clients} />
    </div>
  )
}
