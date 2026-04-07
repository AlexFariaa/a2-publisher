import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GmbPostsList } from './gmb-posts-list'
import type { Profile, GmbPost } from '@/lib/supabase/types'

export default async function GmbPostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if ((myProfile as Profile | null)?.role !== 'admin') redirect('/')

  const { data: posts } = await supabase
    .from('gmb_posts')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Artigos GMB</h1>
        <p className="text-sm text-neutral-500 mt-1">Posts do Google My Business recebidos pelo gerador</p>
      </div>

      <GmbPostsList posts={(posts ?? []) as GmbPost[]} />
    </div>
  )
}
