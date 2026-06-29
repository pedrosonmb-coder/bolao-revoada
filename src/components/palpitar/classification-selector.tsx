'use client'

import { getTeamDisplay } from '@/lib/teams'

type ClassificationSelectorProps = {
  homeTeamCode: string
  awayTeamCode: string
  value: 'home' | 'away' | null
  onChange: (value: 'home' | 'away') => void
  disabled?: boolean
}

export function ClassificationSelector({
  homeTeamCode,
  awayTeamCode,
  value,
  onChange,
  disabled = false,
}: ClassificationSelectorProps) {
  const homeName = getTeamDisplay(homeTeamCode).name
  const awayName = getTeamDisplay(awayTeamCode).name

  return (
    <div className="mt-3 pt-3 border-t border-(--color-border-base)">
      <p className="text-xs text-(--color-text-secondary) mb-2">Quem se classifica?</p>
      <div className="flex gap-2">
        {[
          { code: 'home', name: homeName } as const,
          { code: 'away', name: awayName } as const,
        ].map(({ code, name }) => (
          <button
            key={code}
            type="button"
            onClick={() => !disabled && onChange(code)}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
              value === code
                ? 'bg-(--color-accent-primary) border-(--color-accent-primary) text-white'
                : 'bg-(--color-bg-surface) border-(--color-border-base) text-(--color-text-primary)'
            } disabled:opacity-50`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}
