import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { tiptapJsonToHtml } from '@/lib/tiptap-to-html'

export async function POST(request: NextRequest) {
  const { postId } = await request.json()

  if (!postId) {
    return NextResponse.json({ error: 'postId é obrigatório' }, { status: 400 })
  }

  // 1. Autenticar usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2. Buscar o post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*, sites(id, user_id, platform)')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
  }

  // 3. Verificar que o usuário é dono do site (ou admin)
  const site = (post as { sites: { id: string; user_id: string; platform: string } }).sites
  if (!site || (site.user_id !== user.id)) {
    // checar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  if (site.platform !== 'wordpress') {
    return NextResponse.json({ error: 'Site não é WordPress' }, { status: 400 })
  }

  // 4. Buscar credenciais WP (service role, pois RLS só permite admin)
  const adminSupabase = createAdminClient()
  const { data: creds, error: credsError } = await adminSupabase
    .from('sites_wordpress_credentials')
    .select('*')
    .eq('site_id', site.id)
    .single()

  if (credsError || !creds) {
    return NextResponse.json({ error: 'Credenciais WordPress não encontradas' }, { status: 500 })
  }

  const { wp_url, wp_username, wp_application_password } = creds
  const authHeader = 'Basic ' + Buffer.from(`${wp_username}:${wp_application_password}`).toString('base64')

  // 5. Converter TipTap JSON → HTML
  const htmlContent = tiptapJsonToHtml(
    post.content as Parameters<typeof tiptapJsonToHtml>[0]
  )

  // 6. Upload da imagem de capa para WP Media Library (se existir)
  let featuredMediaId: number | null = null

  if (post.cover_image) {
    try {
      const imageRes = await fetch(post.cover_image)
      if (imageRes.ok) {
        const imageBlob = await imageRes.arrayBuffer()
        const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg'
        const filename = `cover-${post.slug ?? postId}.${contentType.split('/')[1] ?? 'jpg'}`

        const mediaRes = await fetch(`${wp_url}/wp-json/wp/v2/media`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
          body: imageBlob,
        })

        if (mediaRes.ok) {
          const mediaData = await mediaRes.json() as { id: number }
          featuredMediaId = mediaData.id
        }
      }
    } catch {
      // Upload de imagem falhou — continua publicação sem imagem de capa
    }
  }

  // 7. Criar post no WordPress via REST API
  const wpPostBody: Record<string, unknown> = {
    title: post.title,
    content: htmlContent,
    slug: post.slug,
    excerpt: post.seo_description ?? '',
    status: 'publish',
  }
  if (featuredMediaId) wpPostBody.featured_media = featuredMediaId

  const wpRes = await fetch(`${wp_url}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(wpPostBody),
  })

  if (!wpRes.ok) {
    const wpError = await wpRes.text()
    return NextResponse.json(
      { error: `Erro ao publicar no WordPress: ${wpError}` },
      { status: wpRes.status }
    )
  }

  const wpPost = await wpRes.json() as { id: number; link: string }

  // 8. Atualizar status no Supabase
  await supabase
    .from('posts')
    .update({ status: 'published' })
    .eq('id', postId)

  return NextResponse.json({ success: true, wp_post_id: wpPost.id, wp_link: wpPost.link })
}
