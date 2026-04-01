import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { pushPostToGitHub } from '@/lib/github-push'

export async function POST(request: NextRequest) {
  // 1. Autenticar usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2. Validar body
  let body: { post_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { post_id } = body
  if (!post_id) {
    return NextResponse.json({ error: 'post_id obrigatório' }, { status: 400 })
  }

  // 3. Verificar que o usuário é dono do post (ou admin)
  const { data: postData } = await supabase
    .from('posts')
    .select('id, site_id, sites(user_id)')
    .eq('id', post_id)
    .single()

  if (!postData) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
  }

  const siteOwner = (postData as { sites: { user_id: string }[] | null }).sites?.[0]?.user_id

  if (siteOwner !== user.id) {
    // Checar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  // 4. Executar push usando admin client (acesso a todas as colunas sem RLS)
  const admin = createAdminClient()
  const result = await pushPostToGitHub(post_id, admin)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, commit_url: result.commitUrl })
}
