import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { tiptapJsonToHtml } from '@/lib/tiptap-to-html'

export async function POST(request: NextRequest) {
  const { postId, categoryIds, tagIds, scheduledAt } = await request.json() as {
    postId: string
    categoryIds?: number[]
    tagIds?: number[]
    scheduledAt?: string // ISO UTC string
  }

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
  const adminSupabase = await createAdminClient()
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

  // 5. Converter conteúdo para HTML
  // Posts gerados pelo pipeline têm raw_html em vez de TipTap JSON
  const htmlContent = (post.source === 'generated' && post.raw_html)
    ? post.raw_html
    : tiptapJsonToHtml(post.content as Parameters<typeof tiptapJsonToHtml>[0])

  // Ler wp_metadata existente
  const wpMetadata = (post as { wp_metadata?: { category_ids?: number[]; tag_ids?: number[]; wp_post_id?: number; wp_featured_media_id?: number } }).wp_metadata ?? {}
  const existingWpPostId = wpMetadata.wp_post_id ?? null

  // 6. Upload da imagem de capa para WP Media Library (se existir e ainda não tiver sido enviada)
  let featuredMediaId: number | null = wpMetadata.wp_featured_media_id ?? null

  if (post.cover_image && !featuredMediaId) {
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

          // Atualiza title e alt_text do arquivo no Media Library
          const mediaTitle = (post as { seo_title?: string | null }).seo_title || post.title
          await fetch(`${wp_url}/wp-json/wp/v2/media/${mediaData.id}`, {
            method: 'POST',
            headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: mediaTitle, alt_text: post.title }),
          }).catch(() => { /* não bloqueia publicação se falhar */ })
        }
      }
    } catch {
      // Upload de imagem falhou — continua publicação sem imagem de capa
    }
  }

  // 7. Criar ou atualizar post no WordPress via REST API
  // Usa categorias/tags do request; se não veio no body, tenta wp_metadata salvo no post
  const resolvedCategoryIds = categoryIds ?? wpMetadata.category_ids ?? []
  const resolvedTagIds = tagIds ?? wpMetadata.tag_ids ?? []

  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date()
  // WordPress date_gmt espera formato YYYY-MM-DDTHH:MM:SS em UTC
  const wpDateGmt = scheduledAt
    ? new Date(scheduledAt).toISOString().replace(/\.\d{3}Z$/, '')
    : undefined

  const seoTitle = (post as { seo_title?: string | null }).seo_title || post.title
  const seoDescription = post.seo_description ?? ''

  const wpPostBody: Record<string, unknown> = {
    title: post.title,
    content: htmlContent,
    slug: post.slug,
    excerpt: seoDescription,
    status: isScheduled ? 'future' : 'publish',
    ...(wpDateGmt ? { date_gmt: wpDateGmt } : {}),
  }
  if (featuredMediaId) wpPostBody.featured_media = featuredMediaId
  if (resolvedCategoryIds.length > 0) wpPostBody.categories = resolvedCategoryIds
  if (resolvedTagIds.length > 0) wpPostBody.tags = resolvedTagIds

  // Se já existe um post no WP, atualiza; caso contrário, cria novo
  const wpEndpoint = existingWpPostId
    ? `${wp_url}/wp-json/wp/v2/posts/${existingWpPostId}`
    : `${wp_url}/wp-json/wp/v2/posts`

  const wpRes = await fetch(wpEndpoint, {
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

  // 8. Atualizar Yoast SEO meta via endpoint customizado (requer Code Snippets no WP)
  // Ver: POST /wp-json/a2publisher/v1/seo/{id}
  await fetch(`${wp_url}/wp-json/a2publisher/v1/seo/${wpPost.id}`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ seo_title: seoTitle, seo_description: seoDescription }),
  }).catch(() => { /* não bloqueia publicação se snippet não instalado */ })

  // 9. Atualizar status, published_at e wp_metadata no Supabase
  await supabase
    .from('posts')
    .update({
      status: 'published',
      published_at: scheduledAt ?? new Date().toISOString(),
      wp_metadata: {
        ...wpMetadata,
        wp_post_id: wpPost.id,
        ...(featuredMediaId ? { wp_featured_media_id: featuredMediaId } : {}),
        category_ids: resolvedCategoryIds,
        tag_ids: resolvedTagIds,
      },
    })
    .eq('id', postId)

  return NextResponse.json({ success: true, wp_post_id: wpPost.id, wp_link: wpPost.link })
}
