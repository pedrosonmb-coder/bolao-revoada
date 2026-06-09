'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getTelegramWebApp, type TelegramWebApp } from '@/lib/telegram/web-app'
import { apiFetch } from '@/lib/api/client'

type AppUser = {
  id: number
  telegram_id: number
  first_name: string
  last_name?: string | null
  display_name?: string | null
  photo_url?: string | null
  is_admin: boolean
  is_active: boolean
  paid_at?: Date | null
}

type TelegramContextValue = {
  user: AppUser | null
  tg: TelegramWebApp | null
  isLoading: boolean
  error: string | null
}

const TelegramContext = createContext<TelegramContextValue>({
  user: null,
  tg: null,
  isLoading: true,
  error: null,
})

export function useTelegram() {
  return useContext(TelegramContext)
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [tg, setTg] = useState<TelegramWebApp | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const webApp = getTelegramWebApp()

        // Dev bypass: lê ?dev_user_id= da URL
        const devUserId =
          process.env.NODE_ENV !== 'production'
            ? new URLSearchParams(window.location.search).get('dev_user_id')
            : null

        if (devUserId) {
          sessionStorage.setItem('dev_user_id', devUserId)
        }

        if (webApp) {
          setTg(webApp)
          webApp.ready()
          webApp.expand()

          // Aplica tema do Telegram
          const scheme = webApp.colorScheme
          document.documentElement.classList.toggle('dark', scheme === 'dark')
        } else {
          // Fora do Telegram: usa prefers-color-scheme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          document.documentElement.classList.toggle('dark', prefersDark)
        }

        // Busca usuário via /api/me (suporta initData ou dev bypass)
        const data = await apiFetch<{ user: AppUser }>('/api/me')
        setUser(data.user)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de autenticação')
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  return (
    <TelegramContext.Provider value={{ user, tg, isLoading, error }}>
      {children}
    </TelegramContext.Provider>
  )
}
