'use client'

import { useEffect, useState } from 'react'

type AuthedUser = {
  id: number
  telegram_id: number
  first_name: string
  is_admin: boolean
  is_active: boolean
  paid_at: string | null
  photo_url: string | null
}

export default function HomePage() {
  const [user, setUser] = useState<AuthedUser | null>(null)
  const [inTelegram, setInTelegram] = useState<boolean | null>(null)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const tg = window.Telegram?.WebApp

    if (tg) {
      setInTelegram(true)
      tg.ready()
      tg.expand()

      // Aplica tema do Telegram
      if (tg.colorScheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      // Autentica com o servidor
      fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('auth_failed')
          return res.json()
        })
        .then((data: { user: AuthedUser }) => {
          setUser(data.user)
        })
        .catch(() => {
          setAuthError(true)
        })
    } else {
      setInTelegram(false)

      // Fora do Telegram: aplica tema via prefers-color-scheme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        gap: '1rem',
        backgroundColor: 'var(--color-bg-base)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Logo */}
      <h1
        style={{
          fontFamily: 'var(--font-tight)',
          fontWeight: 800,
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: 'center',
          margin: 0,
        }}
      >
        Bolão do Revoada
      </h1>

      {/* Estado de carregamento / mensagem */}
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '1rem',
          color: 'var(--color-text-secondary)',
          margin: 0,
          textAlign: 'center',
        }}
      >
        {inTelegram === null && 'Carregando...'}
        {inTelegram === false && 'Abra esta página pelo Telegram'}
        {inTelegram === true && !user && !authError && 'Autenticando...'}
        {inTelegram === true && authError && 'Erro de autenticação. Tente reabrir o app.'}
        {inTelegram === true && user && `Olá, ${user.first_name}`}
      </p>

      {/* Tag "sistema em construção" */}
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.75rem',
          color: 'var(--color-text-secondary)',
          opacity: 0.6,
        }}
      >
        Sistema em construção
      </span>
    </main>
  )
}
