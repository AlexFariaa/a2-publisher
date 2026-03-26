import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get('siteId')
  const type = searchParams.get('type') // 'categories' ou 'tags'

  if (!siteId || !type) {
    return NextResponse.json({ error: 'siteId e type são obrigatórios' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()
  const { data: creds } = await adminSupabase
    .from('sites_wordpress_credentials')
    .select('wp_url, wp_username, wp_application_password')
    .eq('site_id', siteId)
    .single()

  if (!creds) {
    return NextResponse.json({ error: 'Credenciais não encontradas' }, { status: 404 })
  }

  const { wp_url, wp_username, wp_application_password } = creds
  const authHeader = 'Basic ' + Buffer.from(`${wp_username}:${wp_application_password}`).toString('base64')

  const endpoint = type === 'tags' ? 'tags' : 'categories'

  try {
    const wpRes = await fetch(`${wp_url}/wp-json/wp/v2/${endpoint}?per_page=100&orderby=name&order=asc`, {
      headers: { Authorization: authHeader },
    })

    if (!wpRes.ok) {
      return NextResponse.json({ error: 'Erro ao buscar taxonomias do WordPress' }, { status: 500 })
    }

    const items = await wpRes.json() as Array<{ id: number; name: string; slug: string; count: number }>
    return NextResponse.json({ items: items.map(i => ({ id: i.id, name: i.name, slug: i.slug, count: i.count })) })
  } catch {
    return NextResponse.json({ error: 'Erro ao conectar ao WordPress' }, { status: 500 })
  }
}
