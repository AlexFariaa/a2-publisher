import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Site } from '@/lib/supabase/types'
import { IntegrationClient } from './integration-client'

interface Props {
  params: Promise<{ siteId: string }>
}

export default async function IntegrationPage({ params }: Props) {
  const { siteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: siteData } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .single()

  const site = siteData as Site | null
  if (!site) notFound()

  // Detecta o domínio atual automaticamente — funciona em localhost e produção
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const apiBase = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`

  return <IntegrationClient site={site} apiBase={apiBase} />
}
