'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MatchCard } from './match-card'
import { ProgressBar } from './progress-bar'
import type { Match } from '@/lib/db/schema'
import type { MyPrediction } from '@/hooks/use-my-predictions'

type GroupsListProps = {
  matches: Match[]
  predictionsMap: Map<number, MyPrediction>
  onSaved?: (matchId: number, hs: number, as_: number, qtc: string | null) => void
  isPaid: boolean
}

export function GroupsList({ matches, predictionsMap, onSaved, isPaid }: GroupsListProps) {
  // Agrupa por group_name
  const groups = new Map<string, Match[]>()
  for (const m of matches) {
    const key = m.group_name ?? 'Outros'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }

  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))

  const totalMatches = matches.length
  const totalDone = matches.filter((m) => predictionsMap.has(m.id)).length

  return (
    <div>
      <ProgressBar
        done={totalDone}
        total={totalMatches}
        label="Fase de grupos"
      />

      {sortedGroups.length === 0 && (
        <div className="px-4 py-12 text-center text-(--color-text-secondary) text-sm">
          Nenhum jogo nesta fase ainda.
        </div>
      )}

      <div className="divide-y divide-(--color-border-base)">
        {sortedGroups.map(([groupName, groupMatches]) => (
          <GroupAccordion
            key={groupName}
            groupName={groupName}
            matches={groupMatches}
            predictionsMap={predictionsMap}
            onSaved={onSaved}
            isPaid={isPaid}
          />
        ))}
      </div>
    </div>
  )
}

type GroupAccordionProps = {
  groupName: string
  matches: Match[]
  predictionsMap: Map<number, MyPrediction>
  onSaved?: (matchId: number, hs: number, as_: number, qtc: string | null) => void
  isPaid: boolean
}

function GroupAccordion({ groupName, matches, predictionsMap, onSaved, isPaid }: GroupAccordionProps) {
  const [open, setOpen] = useState(false)
  const done = matches.filter((m) => predictionsMap.has(m.id)).length

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left bg-(--color-bg-base) hover:bg-(--color-bg-surface) transition-colors"
      >
        <span className="font-medium text-(--color-text-primary) text-sm">{groupName}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-(--color-text-secondary)">
            {done}/{matches.length}
          </span>
          <ChevronDown
            size={16}
            className={`text-(--color-text-secondary) transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 bg-(--color-bg-surface)">
          {matches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              prediction={predictionsMap.get(m.id)}
              onSaved={onSaved}
              isPaid={isPaid}
            />
          ))}
        </div>
      )}
    </div>
  )
}
