export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-(--color-status-success-bg) text-(--color-status-success)',
  warning: 'bg-(--color-status-warning-bg) text-(--color-status-warning)',
  danger:  'bg-(--color-status-danger-bg) text-(--color-status-danger)',
  info:    'bg-(--color-status-info-bg) text-(--color-status-info)',
  neutral: 'bg-(--color-bg-surface) text-(--color-text-secondary)',
}

type BadgeProps = {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'neutral', className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
