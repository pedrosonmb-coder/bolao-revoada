export type CardVariant = 'default' | 'elevated' | 'flat'

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-(--color-bg-surface) border border-(--color-border-base) shadow-[var(--shadow-card)]',
  elevated: 'bg-(--color-bg-surface) shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
  flat: 'bg-(--color-bg-surface)',
}

type CardProps = {
  variant?: CardVariant
  className?: string
  children: React.ReactNode
}

export function Card({ variant = 'default', className = '', children }: CardProps) {
  return (
    <div className={`rounded-2xl p-5 ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}

Card.Title = function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`font-[family-name:var(--font-tight)] font-bold uppercase text-xs tracking-wider text-(--color-text-secondary) mb-3 ${className}`}>
      {children}
    </h3>
  )
}
