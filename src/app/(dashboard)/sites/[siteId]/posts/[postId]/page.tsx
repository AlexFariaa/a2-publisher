import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostEditor } from './post-editor'
import type { Site, Post } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ siteId: string; postId: string }>
}

export default async function PostEditorPage({ params }: Props) {
  const { siteId, postId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: siteData }, { data: postData }] = await Promise.all([
    supabase.from('sites').select('*').eq('id', siteId).single(),
    supabase.from('posts').select('*').eq('id', postId).eq('site_id', siteId).single(),
  ])

  const site = siteData as Site | null
  const post = postData as Post | null

  if (!site || !post) notFound()

  return <PostEditor post={post} site={site} />
}
