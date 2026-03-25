import { redirect, notFound } from 'next/navigation'
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

  const apiBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://seu-dominio.com'

  return <IntegrationClient site={site} apiBase={apiBase} />
}
