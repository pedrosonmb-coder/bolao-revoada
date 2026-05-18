export async function adminFetch<T>(
  url: string,
  telegramId: number,
  options?: RequestInit & { confirm?: boolean }
): Promise<T> {
  const { confirm, ...fetchOptions } = options ?? {}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-admin-id': String(telegramId),
    ...(options?.headers as Record<string, string>),
  }
  if (confirm) headers['x-confirm'] = 'yes'

  let res: Response
  try {
    res = await fetch(url, { ...fetchOptions, headers })
  } catch {
    throw new Error('Sem conexão com o servidor')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw Object.assign(new Error(body.error ?? 'Erro desconhecido'), { status: res.status, body })
  }

  return res.json() as Promise<T>
}
