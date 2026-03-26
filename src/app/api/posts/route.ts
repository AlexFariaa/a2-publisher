import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const apiKey = searchParams.get('api_key')
  const slug = searchParams.get('slug') // opcional: buscar post específico

  if (!apiKey) {
    return NextResponse.json({ error: 'api_key obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()

  // Valida o api_key e busca o site correspondente
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('api_key', apiKey)
    .single()

  if (!site) {
    return NextResponse.json({ error: 'api_key inválido' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Busca post único por slug
  if (slug) {
    const { data: post } = await supabase
      .from('posts')
      .select('id, title, slug, content, cover_image, seo_title, seo_description, created_at, updated_at, published_at')
      .eq('site_id', site.id)
      .eq('slug', slug)
      .eq('status', 'published')
      .lte('published_at', now)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ post }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  // Busca todos os posts publicados (e cuja data de publicação já chegou)
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, slug, cover_image, seo_title, seo_description, created_at, updated_at, published_at')
    .eq('site_id', site.id)
    .eq('status', 'published')
    .lte('published_at', now)
    .order('published_at', { ascending: false })

  return NextResponse.json({ posts: posts ?? [] }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}
