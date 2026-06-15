export function pointsColor(base: number): string {
  if (base === 25) return 'var(--color-accent-primary)'
  if (base === 18) return 'var(--color-status-success)'
  if (base >= 10) return '#65A30D'
  return '#9CA3AF'
}
