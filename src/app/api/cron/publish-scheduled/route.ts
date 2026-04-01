import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { pushPostToGitHub } from '@/lib/github-push'

export async function GET(request: NextRequest) {
  // 1. Validar CRON_SECRET
  const authHeader = request.headers.get('Authorization')
  const secret = authHeader?.replace('Bearer ', '')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // 2. Buscar posts gerados, publicados, sem github_sha, cujo horário já passou
  const { data: posts, error } = await admin
    .from('posts')
    .select('id, sites!inner(platform)')
    .eq('status', 'published')
    .eq('source', 'generated')
    .is('github_sha', null)
    .lte('published_at', now)

  if (error) {
    console.error('[cron/publish-scheduled] Erro ao buscar posts:', error)
    return NextResponse.json({ error: 'Erro ao buscar posts' }, { status: 500 })
  }

  // 3. Filtrar apenas sites não-wordpress (wordpress publica via /api/publish-wordpress)
  const toProcess = (posts ?? []).filter(
    (p) => (p as { sites: { platform: string } }).sites.platform !== 'wordpress',
  )

  // 4. Processar cada post sequencialmente para evitar rate limit do GitHub
  const results: Array<{ post_id: string; success: boolean; commitUrl?: string; error?: string }> = []

  for (const p of toProcess) {
    const result = await pushPostToGitHub(p.id, admin)
    results.push({ post_id: p.id, ...result })

    // Pequeno delay entre pushes para não atingir rate limit
    if (toProcess.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: now,
  })
}
