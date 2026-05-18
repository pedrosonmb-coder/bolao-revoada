import Link from 'next/link'

type Props = {
  title: string
  description?: string
  action?: { label: string; href: string }
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <p className="font-[family-name:var(--font-tight)] font-black text-lg uppercase text-(--color-text-primary) mb-1">
        {title}
      </p>
      {description && (
        <p className="text-sm text-(--color-text-secondary) mb-4">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="text-sm font-medium text-(--color-accent-primary) underline underline-offset-2"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
