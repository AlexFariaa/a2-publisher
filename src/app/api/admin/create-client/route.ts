import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // Verifica se quem chama é admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem criar clientes' }, { status: 403 })
  }

  const { full_name, email, password } = await request.json()

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Usa service role para criar o usuário no Supabase Auth
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'user' },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user: data.user }, { status: 201 })
}
