export function getDisplayName(user: {
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
}): string {
  if (user.display_name?.trim()) return user.display_name.trim()
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return full || 'Participante'
}
