'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'
import { LayoutDashboard, LogOut, MapPin, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/', label: 'Meus Sites', icon: LayoutDashboard },
  ]

  const adminItems = [
    { href: '/admin/clients', label: 'Clientes', icon: Users },
    { href: '/admin/sites', label: 'Sites', icon: Settings },
    { href: '/admin/gmb-posts', label: 'Artigos GMB', icon: MapPin },
  ]

  return (
    <aside className="w-60 h-screen border-r border-neutral-200 bg-white flex flex-col sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">A2 Publisher</span>
      </div>
      <Separator />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
            )}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}

        {profile.role === 'admin' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Admin</span>
            </div>
            {adminItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <Separator />

      {/* User info */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-neutral-200">
              {profile.full_name?.[0]?.toUpperCase() ?? profile.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{profile.full_name ?? 'Usuário'}</p>
            <p className="text-xs text-neutral-400 truncate">{profile.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 w-8 shrink-0 text-neutral-400 hover:text-neutral-900"
        >
          <LogOut size={16} />
        </Button>
      </div>
    </aside>
  )
}
