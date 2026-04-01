import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // 1. Validar header de autenticação
  const generatorKey = request.headers.get('X-Generator-Api-Key')
  if (!generatorKey) {
    return NextResponse.json({ error: 'Header X-Generator-Api-Key obrigatório' }, { status: 401 })
  }

  // 2. Ler FormData
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const siteId = formData.get('site_id') as string | null
  const postSlug = formData.get('post_slug') as string | null
  const filename = formData.get('filename') as string | null  // ex: "inline-1.avif"

  if (!file || !siteId || !postSlug || !filename) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: file, site_id, post_slug, filename' },
      { status: 400 },
    )
  }

  // Sanitizar filename para evitar path traversal
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '-')

  const admin = createAdminClient()

  // 3. Dupla validação: generator_api_key + site_id devem corresponder
  const { data: site } = await admin
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('generator_api_key', generatorKey)
    .single()

  if (!site) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  // 4. Determinar content-type
  const contentType = file.type || 'image/avif'
  const storagePath = `${siteId}/${postSlug}/${safeFilename}`

  // 5. Upload para Supabase Storage
  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('post-images')
    .upload(storagePath, buffer, { contentType, upsert: true })

  if (uploadError) {
    console.error('[upload-inline-image] Erro no upload:', uploadError)
    return NextResponse.json({ error: 'Erro ao fazer upload da imagem' }, { status: 500 })
  }

  // 6. Obter URL pública
  const { data: urlData } = admin.storage
    .from('post-images')
    .getPublicUrl(storagePath)

  return NextResponse.json({ url: urlData.publicUrl })
}
