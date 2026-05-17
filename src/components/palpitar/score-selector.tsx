'use client'

type ScoreSelectorProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
}

export function ScoreSelector({ value, onChange, min = 0, max = 9, disabled = false }: ScoreSelectorProps) {
  const decrement = () => {
    if (!disabled && value > min) onChange(value - 1)
  }
  const increment = () => {
    if (!disabled && value < max) onChange(value + 1)
  }

  return (
    <div className={`flex items-center gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || value <= min}
        className="w-10 h-10 rounded-full border border-(--color-border-base) flex items-center justify-center text-xl font-bold text-(--color-text-primary) disabled:opacity-30 active:scale-95 transition-transform"
        aria-label="Diminuir"
      >
        −
      </button>

      <span className="font-[family-name:var(--font-tight)] font-black text-4xl w-10 text-center text-(--color-text-primary) tabular-nums leading-none">
        {value}
      </span>

      <button
        type="button"
        onClick={increment}
        disabled={disabled || value >= max}
        className="w-10 h-10 rounded-full border border-(--color-border-base) flex items-center justify-center text-xl font-bold text-(--color-text-primary) disabled:opacity-30 active:scale-95 transition-transform"
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  )
}
