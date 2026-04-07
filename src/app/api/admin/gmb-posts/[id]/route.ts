import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as Pick<Profile, 'role'> | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem editar posts GMB' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { status } = body as { status?: string }
  if (!status || !['recebido', 'publicado'].includes(status)) {
    return NextResponse.json(
      { error: 'Campo status inválido. Valores aceitos: recebido, publicado' },
      { status: 400 },
    )
  }

  const { id } = await params

  const { error } = await supabase
    .from('gmb_posts')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('[admin/gmb-posts/patch] Erro ao atualizar status:', error)
    return NextResponse.json({ error: 'Erro interno ao atualizar post' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
