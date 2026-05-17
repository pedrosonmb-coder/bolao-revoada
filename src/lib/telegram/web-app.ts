// Wrapper tipado para window.Telegram.WebApp
// Centraliza o acesso ao SDK do Telegram Mini App

export type TelegramWebApp = NonNullable<Window['Telegram']>['WebApp']

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}

export function isTelegramEnvironment(): boolean {
  const tg = getTelegramWebApp()
  return !!tg?.initData
}
