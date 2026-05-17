type ProgressBarProps = {
  done: number
  total: number
  label: string
}

export function ProgressBar({ done, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="px-4 py-3 bg-(--color-bg-surface)">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-(--color-text-secondary)">{label}</span>
        <span className="text-xs font-medium text-(--color-text-primary) font-[family-name:var(--font-tight)]">
          {done}/{total}
        </span>
      </div>
      <div className="h-1.5 bg-(--color-border-base) rounded-full overflow-hidden">
        <div
          className="h-full bg-(--color-accent-primary) rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
