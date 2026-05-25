const BRT: Intl.DateTimeFormatOptions = { timeZone: 'America/Sao_Paulo' }

/** "13/06, 16h" */
export function formatKickoff(date: Date | string | number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    ...BRT,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(typeof date === 'number' ? date * 1000 : date))
}

/** "13/06" */
export function formatDateShort(date: Date | string | number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    ...BRT,
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(typeof date === 'number' ? date * 1000 : date))
}

/** "13/06/2026 16:00" */
export function formatDateTimeFull(date: Date | string | number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    ...BRT,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(typeof date === 'number' ? date * 1000 : date))
}

/** "13/06/2026" */
export function formatDateOnly(date: Date | string | number | null | undefined): string {
  if (!date) return 'Pendente'
  return new Intl.DateTimeFormat('pt-BR', {
    ...BRT,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(typeof date === 'number' ? date * 1000 : date))
}
