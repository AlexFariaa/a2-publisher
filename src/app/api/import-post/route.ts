import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // 1. Validar header de autenticação
  const generatorKey = request.headers.get('X-Generator-Api-Key')
  if (!generatorKey) {
    return NextResponse.json({ error: 'Header X-Generator-Api-Key obrigatório' }, { status: 401 })
  }

  // 2. Validar body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { site_id, title, slug, raw_html, cover_image_url, seo_title, seo_description } = body as {
    site_id?: string
    title?: string
    slug?: string
    raw_html?: string
    cover_image_url?: string
    seo_title?: string
    seo_description?: string
  }

  if (!site_id || !title || !slug || !raw_html) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: site_id, title, slug, raw_html' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  // 3. Dupla validação: generator_api_key + site_id devem corresponder
  const { data: site } = await admin
    .from('sites')
    .select('id')
    .eq('id', site_id)
    .eq('generator_api_key', generatorKey)
    .single()

  if (!site) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  // 4. Verificar duplicata de slug
  const { data: existing } = await admin
    .from('posts')
    .select('id')
    .eq('site_id', site_id)
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: `Slug "${slug}" já existe neste site` },
      { status: 409 },
    )
  }

  // 5. Criar post como draft
  const { data: post, error } = await admin
    .from('posts')
    .insert({
      site_id,
      title,
      slug,
      raw_html,
      cover_image: cover_image_url ?? null,
      seo_title: seo_title ?? null,
      seo_description: seo_description ?? null,
      source: 'generated',
      status: 'draft',
      content: null,
    })
    .select('id')
    .single()

  if (error || !post) {
    console.error('[import-post] Erro ao criar post:', error)
    return NextResponse.json({ error: 'Erro interno ao criar post' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.json(
    {
      success: true,
      post_id: post.id,
      edit_url: `${appUrl}/sites/${site_id}/posts/${post.id}`,
    },
    { status: 201 },
  )
}
