import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, FileText, ChevronRight } from 'lucide-react'
import type { Site, Profile } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Busca profile e posts em paralelo
  const [{ data: profileData }, { data: postsData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('posts').select('site_id'),
  ])

  const profile = profileData as Profile | null

  let sitesQuery = supabase.from('sites').select('*').order('created_at', { ascending: false })
  if (profile?.role !== 'admin') {
    sitesQuery = sitesQuery.eq('user_id', user.id)
  }

  const { data: sitesData } = await sitesQuery
  const sites = (sitesData ?? []) as Site[]

  const postCountBySite = ((postsData ?? []) as { site_id: string }[]).reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p.site_id]: (acc[p.site_id] ?? 0) + 1 }),
    {}
  )

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Seus Sites</h1>
        <p className="text-sm text-neutral-500 mt-1">Selecione um site para gerenciar os posts</p>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <Globe size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Nenhum site cadastrado ainda.</p>
          {profile?.role === 'admin' && (
            <p className="text-sm mt-1">
              Vá em <Link href="/admin/sites" className="underline">Admin → Sites</Link> para adicionar.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {sites.map(site => (
            <Link key={site.id} href={`/sites/${site.id}`}>
              <Card className="shadow-none border border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer">
                <CardHeader className="py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-neutral-100 flex items-center justify-center">
                        <Globe size={16} className="text-neutral-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium">{site.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{site.domain}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs gap-1">
                        <FileText size={11} />
                        {postCountBySite[site.id] ?? 0} posts
                      </Badge>
                      <ChevronRight size={16} className="text-neutral-400" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
