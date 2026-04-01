'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveGithubConfig(
  siteId: string,
  data: {
    github_repo: string | null
    github_branch: string
    blog_output_path: string | null
    blog_framework: 'vanilla-html' | 'nextjs-ts-data' | 'astro' | 'none' | null
  },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('sites')
    .update(data)
    .eq('id', siteId)

  if (error) throw new Error('Erro ao salvar configuração GitHub')

  revalidatePath(`/sites/${siteId}/integration`)
}
