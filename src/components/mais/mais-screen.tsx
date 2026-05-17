'use client'

import Link from 'next/link'
import { ChevronRight, FileText, Clock, User, ShieldCheck, LogOut } from 'lucide-react'
import { useTelegram } from '@/components/providers/telegram-provider'
import { useSWRConfig } from 'swr'

type NavItemProps = {
  href?: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}

function NavItem({ href, icon, label, onClick }: NavItemProps) {
  const base =
    'flex items-center gap-3 px-4 py-4 text-sm text-(--color-text-primary) hover:bg-(--color-bg-surface) transition-colors'

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`w-full text-left ${base}`}>
        <span className="text-(--color-text-secondary)">{icon}</span>
        <span className="flex-1">{label}</span>
        <ChevronRight size={16} className="text-(--color-text-secondary)" />
      </button>
    )
  }

  return (
    <Link href={href!} className={base}>
      <span className="text-(--color-text-secondary)">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight size={16} className="text-(--color-text-secondary)" />
    </Link>
  )
}

export function MaisScreen() {
  const { user } = useTelegram()
  const { cache } = useSWRConfig()

  function handleLogout() {
    // Limpa cache local do SWR
    if (cache instanceof Map) cache.clear()
    sessionStorage.removeItem('dev_user_id')
    window.location.reload()
  }

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="divide-y divide-(--color-border-base)">
        <NavItem href="/regulamento" icon={<FileText size={18} />} label="Regulamento" />
        <NavItem href="/historico" icon={<Clock size={18} />} label="Histórico de palpites" />
        <NavItem href="/conta" icon={<User size={18} />} label="Minha conta" />
        {user?.is_admin && (
          <NavItem href="/admin" icon={<ShieldCheck size={18} />} label="Painel admin" />
        )}
        <NavItem icon={<LogOut size={18} />} label="Sair" onClick={handleLogout} />
      </div>
    </div>
  )
}
