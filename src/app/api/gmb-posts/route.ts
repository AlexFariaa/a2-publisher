import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

type GmbPostInput = {
  format: string
  title: string
  body: string
  cta: string
  hashtags: string[]
  source_url: string | null
  generated_at: string
}

export async function POST(request: NextRequest) {
  // 1. Validar Bearer token
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Header Authorization obrigatório (Bearer token)' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const expectedKey = process.env.INTERNAL_GMB_API_KEY
  if (!expectedKey || token !== expectedKey) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  // 2. Validar body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { client_id, client_name, posts } = body as {
    client_id?: string
    client_name?: string
    posts?: unknown[]
  }

  if (!client_id || typeof client_id !== 'string') {
    return NextResponse.json({ error: 'Campo obrigatório: client_id (UUID)' }, { status: 400 })
  }
  if (!client_name || typeof client_name !== 'string') {
    return NextResponse.json({ error: 'Campo obrigatório: client_name' }, { status: 400 })
  }
  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    return NextResponse.json({ error: 'Campo obrigatório: posts (array não vazio)' }, { status: 400 })
  }

  const VALID_FORMATS = ['dica', 'dado', 'pergunta', 'cta', 'mito', 'bastidores']

  // 3. Validar cada post
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i] as Record<string, unknown>
    if (!p.format || !VALID_FORMATS.includes(p.format as string)) {
      return NextResponse.json(
        { error: `posts[${i}].format inválido. Valores aceitos: ${VALID_FORMATS.join(', ')}` },
        { status: 400 },
      )
    }
    if (!p.title || typeof p.title !== 'string') {
      return NextResponse.json({ error: `posts[${i}].title obrigatório` }, { status: 400 })
    }
    if (!p.body || typeof p.body !== 'string') {
      return NextResponse.json({ error: `posts[${i}].body obrigatório` }, { status: 400 })
    }
    if (!p.generated_at || typeof p.generated_at !== 'string') {
      return NextResponse.json({ error: `posts[${i}].generated_at obrigatório (ISO 8601)` }, { status: 400 })
    }
  }

  const admin = createAdminClient()

  // 4. Verificar que o client_id existe na tabela profiles
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', client_id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: `client_id "${client_id}" não encontrado` }, { status: 404 })
  }

  // 5. Inserir todos os posts
  const rows = (posts as GmbPostInput[]).map(p => ({
    client_id,
    client_name,
    format: p.format,
    title: p.title,
    body: p.body,
    cta: p.cta ?? '',
    hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
    source_url: p.source_url ?? null,
    generated_at: p.generated_at,
    status: 'recebido' as const,
  }))

  const { data: inserted, error } = await admin
    .from('gmb_posts')
    .insert(rows)
    .select('id')

  if (error || !inserted) {
    console.error('[gmb-posts] Erro ao inserir posts:', error)
    return NextResponse.json({ error: 'Erro interno ao salvar posts' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    received: inserted.length,
    ids: inserted.map(r => r.id),
  })
}
