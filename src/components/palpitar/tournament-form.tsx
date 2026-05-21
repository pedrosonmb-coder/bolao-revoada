'use client'

import { useState } from 'react'
import { TeamPicker } from './team-picker'
import { useToast } from '@/components/ui/toast'
import { saveTournamentPrediction, type TournamentPredictionPayload } from '@/lib/api/predictions'
import type { TournamentPrediction } from '@/lib/db/schema'

type TournamentFormProps = {
  existing: TournamentPrediction | null
  isPaid?: boolean
}

export function TournamentForm({ existing, isPaid = true }: TournamentFormProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<TournamentPredictionPayload>({
    champion_code: existing?.champion_code ?? '',
    runner_up_code: existing?.runner_up_code ?? '',
    semifinalist_1_code: existing?.semifinalist_1_code ?? '',
    semifinalist_2_code: existing?.semifinalist_2_code ?? '',
    top_scorer_name: existing?.top_scorer_name ?? '',
    best_player_name: existing?.best_player_name ?? '',
    best_young_player_name: existing?.best_young_player_name ?? '',
  })
  const [saving, setSaving] = useState(false)

  function setField(key: keyof TournamentPredictionPayload, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Todos os times escolhidos exceto o próprio campo atual
  function getExcluded(self: keyof TournamentPredictionPayload): string[] {
    const teamKeys: (keyof TournamentPredictionPayload)[] = [
      'champion_code',
      'runner_up_code',
      'semifinalist_1_code',
      'semifinalist_2_code',
    ]
    return teamKeys.filter((k) => k !== self).map((k) => form[k]).filter(Boolean) as string[]
  }

  function validate(): string | null {
    const teamKeys: (keyof TournamentPredictionPayload)[] = [
      'champion_code',
      'runner_up_code',
      'semifinalist_1_code',
      'semifinalist_2_code',
    ]
    for (const k of teamKeys) {
      if (!form[k]) return 'Preencha todas as seleções de times'
    }
    const codes = teamKeys.map((k) => form[k])
    if (new Set(codes).size !== codes.length) {
      return 'Campeão, vice e outros semifinalistas devem ser seleções diferentes'
    }
    if (!form.top_scorer_name.trim()) return 'Informe o artilheiro'
    if (!form.best_player_name.trim()) return 'Informe o melhor jogador'
    if (!form.best_young_player_name.trim()) return 'Informe o melhor jovem'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) {
      toast(err, 'error')
      return
    }
    setSaving(true)
    try {
      await saveTournamentPrediction(form)
      toast('Palpites de torneio salvos')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const textFields = [
    { key: 'top_scorer_name' as const, label: 'Artilheiro', pts: 50 },
    { key: 'best_player_name' as const, label: 'Melhor jogador (Bola de Ouro)', pts: 50 },
    { key: 'best_young_player_name' as const, label: 'Melhor jovem', pts: 25 },
  ]

  const formDisabled = !isPaid || saving

  return (
    <form onSubmit={handleSubmit} className={`px-4 py-4 space-y-4 ${!isPaid ? 'opacity-60 pointer-events-none' : ''}`}>
      <p className="text-sm text-(--color-text-secondary)">
        {isPaid
          ? 'Palpites pré-Copa. Confirme antes de enviar. Máximo: 325 pts.'
          : 'Pagamento pendente. Palpites bloqueados até confirmação.'}
      </p>

      {/* Campeão */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-sm font-medium text-(--color-text-primary)">Campeão</label>
          <span className="text-xs text-(--color-text-secondary)">100 pts</span>
        </div>
        <TeamPicker
          value={form.champion_code}
          onChange={(v) => setField('champion_code', v)}
          placeholder="Selecionar campeão"
          exclude={getExcluded('champion_code')}
        />
      </div>

      {/* Vice-campeão */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-sm font-medium text-(--color-text-primary)">Vice-campeão</label>
          <span className="text-xs text-(--color-text-secondary)">50 pts</span>
        </div>
        <TeamPicker
          value={form.runner_up_code}
          onChange={(v) => setField('runner_up_code', v)}
          placeholder="Selecionar vice-campeão"
          exclude={getExcluded('runner_up_code')}
        />
      </div>

      {/* Outros 2 semifinalistas */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium text-(--color-text-primary)">Outros semifinalistas</p>
          <span className="text-xs text-(--color-text-secondary)">25 pts cada</span>
        </div>
        <p className="text-xs text-(--color-text-secondary) mb-3 -mt-1">
          Campeão e vice já contam como semis. Escolha os outros 2, sem ordem.
        </p>
        <div className="space-y-2">
          <TeamPicker
            value={form.semifinalist_1_code}
            onChange={(v) => setField('semifinalist_1_code', v)}
            placeholder="Semifinalista"
            exclude={getExcluded('semifinalist_1_code')}
          />
          <TeamPicker
            value={form.semifinalist_2_code}
            onChange={(v) => setField('semifinalist_2_code', v)}
            placeholder="Semifinalista"
            exclude={getExcluded('semifinalist_2_code')}
          />
        </div>
      </div>

      {/* Campos de texto */}
      {textFields.map(({ key, label, pts }) => (
        <div key={key}>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-medium text-(--color-text-primary)">{label}</label>
            <span className="text-xs text-(--color-text-secondary)">{pts} pts</span>
          </div>
          <input
            type="text"
            value={form[key] as string}
            onChange={(e) => setField(key, e.target.value)}
            placeholder={`Nome do ${label.toLowerCase()}`}
            className="w-full px-3 py-2.5 rounded-lg border border-(--color-border-base) bg-(--color-bg-base) text-sm text-(--color-text-primary) placeholder:text-(--color-text-secondary) outline-none focus:border-(--color-accent-primary)"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={formDisabled}
        className="w-full py-3 rounded-xl bg-(--color-accent-primary) text-white font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-opacity mt-2"
      >
        {saving ? 'Salvando...' : 'Salvar palpites de torneio'}
      </button>
    </form>
  )
}
