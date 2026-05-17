'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import useSWR from 'swr'
import { swrFetcher } from '@/lib/api/client'
import { getTeamDisplay } from '@/lib/teams'

type Team = { code: string; name: string }

type TeamPickerProps = {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  disabled?: boolean
  exclude?: string[]
}

export function TeamPicker({ value, onChange, placeholder = 'Selecionar seleção', disabled = false, exclude = [] }: TeamPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useSWR<{ teams: Team[] }>('/api/teams', swrFetcher)
  const allTeams = data?.teams ?? []
  const teams = allTeams
    .filter((t) => !exclude.includes(t.code))
    .filter(
      (t) =>
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase())
    )

  const selectedTeam = allTeams.find((t) => t.code === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-(--color-bg-surface)'
        } bg-(--color-bg-base) border-(--color-border-base) text-(--color-text-primary)`}
      >
        {selectedTeam ? (
          <span className="text-(--color-text-primary) flex items-center gap-1.5">
            <span>{getTeamDisplay(selectedTeam.code).flag}</span>
            <span>{getTeamDisplay(selectedTeam.code).name}</span>
          </span>
        ) : (
          <span className="text-(--color-text-secondary)">{placeholder}</span>
        )}
        <ChevronDown size={14} className={`text-(--color-text-secondary) transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-(--color-bg-base) border border-(--color-border-base) rounded-lg shadow-lg max-h-52 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-(--color-border-base) flex items-center gap-2">
            <Search size={14} className="text-(--color-text-secondary) shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 text-sm outline-none bg-transparent text-(--color-text-primary) placeholder:text-(--color-text-secondary)"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {teams.length === 0 && (
              <p className="text-center text-sm text-(--color-text-secondary) py-4">Nenhum resultado.</p>
            )}
            {teams.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => {
                  onChange(t.code)
                  setOpen(false)
                  setSearch('')
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-(--color-bg-surface) transition-colors text-(--color-text-primary)"
              >
                <span>{getTeamDisplay(t.code).flag}</span>
                <span>{getTeamDisplay(t.code).name}</span>
                <span className="ml-auto text-xs text-(--color-text-secondary)">{t.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
