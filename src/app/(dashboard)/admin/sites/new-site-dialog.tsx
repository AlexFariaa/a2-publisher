'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'

interface Client {
  id: string
  full_name: string | null
  email: string
}

interface NewSiteDialogProps {
  clients: Client[]
}

export function NewSiteDialog({ clients }: NewSiteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', domain: '', user_id: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('sites').insert({
      name: form.name,
      domain: form.domain,
      user_id: form.user_id,
    })

    setLoading(false)

    if (error) {
      toast.error('Erro ao criar site')
      return
    }

    toast.success('Site criado com sucesso!')
    setOpen(false)
    setForm({ name: '', domain: '', user_id: '' })
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative">
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
          <Button type="submit" className="w-full" disabled={loading || !form.user_id}>
            {loading ? 'Criando...' : 'Criar Site'}
          </Button>
        </form>
      </div>
    </div>
  )
}
