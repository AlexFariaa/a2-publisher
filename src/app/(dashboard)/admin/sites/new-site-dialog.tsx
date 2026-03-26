'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, X, Info } from 'lucide-react'

interface Client {
  id: string
  full_name: string | null
  email: string
}

interface NewSiteDialogProps {
  clients: Client[]
}

const EMPTY_FORM = {
  name: '',
  domain: '',
  user_id: '',
  platform: 'supabase' as 'supabase' | 'wordpress',
  wp_url: '',
  wp_username: '',
  wp_application_password: '',
}

export function NewSiteDialog({ clients }: NewSiteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    const { data: siteData, error } = await supabase
      .from('sites')
      .insert({
        name: form.name,
        domain: form.domain,
        user_id: form.user_id,
        platform: form.platform,
      })
      .select('id')
      .single()

    if (error || !siteData) {
      toast.error('Erro ao criar site')
      setLoading(false)
      return
    }

    if (form.platform === 'wordpress') {
      const { error: wpError } = await supabase
        .from('sites_wordpress_credentials')
        .insert({
          site_id: siteData.id,
          wp_url: form.wp_url.replace(/\/$/, ''), // remove trailing slash
          wp_username: form.wp_username,
          wp_application_password: form.wp_application_password,
        })

      if (wpError) {
        toast.error('Site criado, mas erro ao salvar credenciais WordPress')
        setLoading(false)
        return
      }
    }

    setLoading(false)
    toast.success('Site criado com sucesso!')
    setOpen(false)
    setForm(EMPTY_FORM)
    router.refresh()
  }

  if (!open) {
    return (
      <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Plus size={15} /> Novo Site
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600"
        >
          <X size={18} />
        </button>
        <h2 className="text-lg font-semibold mb-1">Novo Site</h2>
        <p className="text-sm text-neutral-500 mb-5">Vincule o site a um cliente existente.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do site</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Clínica X"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Domínio</Label>
            <Input
              value={form.domain}
              onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              placeholder="https://clinicax.com.br"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <select
              value={form.user_id}
              onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
              required
              className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white"
            >
              <option value="">Selecione o cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name ?? c.email}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de plataforma */}
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['supabase', 'wordpress'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, platform: p }))}
                  className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                    form.platform === p
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {p === 'supabase' ? 'Supabase (API)' : 'WordPress'}
                </button>
              ))}
            </div>
          </div>

          {/* Campos específicos de WordPress */}
          {form.platform === 'wordpress' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Para gerar a Application Password, acesse o <strong>WP Admin → Usuários → Seu Perfil</strong>, role até <strong>"Application Passwords"</strong>, digite um nome (ex: <em>A2 Publisher</em>) e clique em <strong>"Add New Application Password"</strong>. Copie a senha gerada — ela só aparece uma vez.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>URL do WordPress</Label>
                <Input
                  value={form.wp_url}
                  onChange={e => setForm(f => ({ ...f, wp_url: e.target.value }))}
                  placeholder="https://meusite.com"
                  required={form.platform === 'wordpress'}
                  type="url"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Usuário WordPress</Label>
                <Input
                  value={form.wp_username}
                  onChange={e => setForm(f => ({ ...f, wp_username: e.target.value }))}
                  placeholder="admin"
                  required={form.platform === 'wordpress'}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Application Password</Label>
                <Input
                  value={form.wp_application_password}
                  onChange={e => setForm(f => ({ ...f, wp_application_password: e.target.value }))}
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  required={form.platform === 'wordpress'}
                  type="password"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || !form.user_id}>
            {loading ? 'Criando...' : 'Criar Site'}
          </Button>
        </form>
      </div>
    </div>
  )
}
