import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ siteId: string }>
}

export default async function NewPostPage({ params }: Props) {
  const { siteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .single()

  if (!site) notFound()

  // Cria um rascunho vazio e redireciona para o editor
  const { data: post, error } = await supabase
    .from('posts')
    .insert({ site_id: siteId, title: '', slug: '', status: 'draft' })
    .select()
    .single()

  if (error || !post) redirect(`/sites/${siteId}`)

  redirect(`/sites/${siteId}/posts/${post.id}`)
}
