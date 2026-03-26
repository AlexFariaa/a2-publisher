import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewSiteDialog } from './new-site-dialog'
import { SitesList } from './sites-list'
import type { Site, Profile, Post } from '@/lib/supabase/types'

export default async function AdminSitesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile | null
  if (profile?.role !== 'admin') redirect('/')

  const [{ data: sitesData }, { data: clientsData }, { data: postsData }] = await Promise.all([
    supabase.from('sites').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('role', 'user'),
    supabase.from('posts').select('site_id'),
  ])

  const sites = (sitesData ?? []) as Site[]
  const clients = (clientsData ?? []) as Profile[]
  const posts = (postsData ?? []) as Pick<Post, 'site_id'>[]

  const postCountBySite = posts.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p.site_id]: (acc[p.site_id] ?? 0) + 1 }),
    {}
  )

  const clientById = Object.fromEntries(clients.map(c => [c.id, c]))

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sites</h1>
          <p className="text-sm text-neutral-500 mt-1">Gerencie todos os sites cadastrados</p>
        </div>
        <NewSiteDialog clients={clients} />
      </div>

      <SitesList sites={sites.map(site => {
        const owner = clientById[site.user_id]
        return {
          id: site.id,
          name: site.name,
          domain: site.domain,
          postCount: postCountBySite[site.id] ?? 0,
          ownerName: owner?.full_name ?? owner?.email ?? '—',
        }
      })} />
    </div>
  )
}
