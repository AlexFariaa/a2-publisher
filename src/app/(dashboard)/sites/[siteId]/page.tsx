import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, ChevronLeft, Plug } from 'lucide-react'
import type { Site, Post } from '@/lib/supabase/types'
import { PostsList } from './posts-list'

interface Props {
  params: Promise<{ siteId: string }>
}

export default async function SitePage({ params }: Props) {
  const { siteId } = await params
  const supabase = await createClient()

  const [{ data: siteData }, { data: postsData }] = await Promise.all([
    supabase.from('sites').select('*').eq('id', siteId).single(),
    supabase.from('posts')
      .select('id, title, slug, status, published_at, created_at, updated_at')
      .eq('site_id', siteId)
      .order('updated_at', { ascending: false }),
  ])

  const site = siteData as Site | null
  if (!site) notFound()

  const posts = (postsData ?? []) as Pick<Post, 'id' | 'title' | 'slug' | 'status' | 'published_at' | 'created_at' | 'updated_at'>[]

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-neutral-400 hover:text-neutral-600 flex items-center gap-1 mb-4"
        >
          <ChevronLeft size={14} /> Todos os sites
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
            <p className="text-sm text-neutral-400 mt-0.5">{site.domain}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/sites/${siteId}/integration`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Plug size={15} />
                Integração
              </Button>
            </Link>
            <Link href={`/sites/${siteId}/posts/new`}>
              <Button size="sm" className="gap-2">
                <Plus size={15} />
                Novo Post
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Lista de posts */}
      <PostsList posts={posts} siteId={siteId} />
    </div>
  )
}
