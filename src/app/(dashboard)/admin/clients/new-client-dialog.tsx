'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'

export function NewClientDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/admin/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(data.error ?? 'Erro ao criar cliente')
      return
    }

    toast.success('Cliente criado com sucesso!')
    setOpen(false)
    setForm({ full_name: '', email: '', password: '' })
    router.refresh()
  }

  if (!open) {
    return (
      <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Plus size={15} /> Novo Cliente
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
        <h2 className="text-lg font-semibold mb-1">Novo Cliente</h2>
        <p className="text-sm text-neutral-500 mb-5">
          O cliente receberá acesso ao painel com as credenciais definidas.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="João Silva"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="joao@empresa.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Senha inicial</Label>
            <Input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Cliente'}
          </Button>
        </form>
      </div>
    </div>
  )
}
