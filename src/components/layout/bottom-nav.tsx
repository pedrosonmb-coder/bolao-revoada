'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Target, Trophy, Menu } from 'lucide-react'

const tabs = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/palpitar', label: 'Palpitar', icon: Target },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  { href: '/mais', label: 'Mais', icon: Menu },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-(--color-bg-base) border-t border-(--color-border-base)"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 min-h-[52px] transition-colors ${
                active
                  ? 'text-(--color-accent-primary)'
                  : 'text-(--color-text-secondary)'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
