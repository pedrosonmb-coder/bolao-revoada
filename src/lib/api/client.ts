'use client'

import { getTelegramWebApp } from '@/lib/telegram/web-app'

function getAuthHeader(): string {
  if (typeof window === 'undefined') return ''

  // Dev bypass: lê x-dev-user-id do sessionStorage (definido pelo TelegramProvider)
  if (process.env.NODE_ENV !== 'production') {
    const devUserId = sessionStorage.getItem('dev_user_id')
    if (devUserId) return `dev ${devUserId}`
  }

  const tg = getTelegramWebApp()
  if (tg?.initData) return `tma ${tg.initData}`
  return ''
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const authHeader = getAuthHeader()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (authHeader) headers['Authorization'] = authHeader

  let res: Response
  try {
    res = await fetch(url, { ...options, headers })
  } catch {
    throw new Error('Sem conexão com o servidor')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw Object.assign(new Error(body.error ?? 'Erro desconhecido'), { status: res.status, body })
  }

  return res.json() as Promise<T>
}

// Fetcher compatível com SWR
export function swrFetcher<T>(url: string): Promise<T> {
  return apiFetch<T>(url)
}
