import { describe, it, expect } from 'vitest'
import { resolveChampionBlock } from '../phase-champion-block'
import { phaseChampionMessage, overallChampionMessage, tournamentRequiredAlertMessage } from '@/lib/telegram/messages'

describe('resolveChampionBlock', () => {
  it('group → group', () => {
    expect(resolveChampionBlock('group')).toBe('group')
  })

  it('todos os stages eliminatórios → knockout', () => {
    for (const stage of ['r32', 'r16', 'qf', 'sf', '3rd', 'final']) {
      expect(resolveChampionBlock(stage)).toBe('knockout')
    }
  })

  it('stage desconhecido → null (não dispara)', () => {
    expect(resolveChampionBlock('unknown')).toBeNull()
    expect(resolveChampionBlock('')).toBeNull()
  })

  it('só group e knockout disparam (não fases individuais sem stage)', () => {
    const validStages = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']
    for (const s of validStages) {
      expect(resolveChampionBlock(s)).not.toBeNull()
    }
  })
})

describe('phaseChampionMessage (grupo)', () => {
  it('group — único campeão', () => {
    const msg = phaseChampionMessage('group', ['Alice'], 347)
    expect(msg).toContain('Fase de grupos encerrada')
    expect(msg).toContain('Alice')
    expect(msg).toContain('347')
    expect(msg).toContain('🏆')
  })

  it('group — empate: ambos os nomes na mensagem', () => {
    const msg = phaseChampionMessage('group', ['Alice', 'Bob'], 300)
    expect(msg).toContain('Alice')
    expect(msg).toContain('Bob')
    expect(msg).toContain('300')
  })
})

describe('overallChampionMessage (Campeão Geral do Bolão)', () => {
  it('único campeão: contém nome, pontos e 🏆', () => {
    const msg = overallChampionMessage(['Bob'], 487)
    expect(msg).toContain('Bob')
    expect(msg).toContain('487')
    expect(msg).toContain('🏆')
    expect(msg).toContain('Campeão Geral')
  })

  it('empate: ambos os nomes na mensagem', () => {
    const msg = overallChampionMessage(['Alice', 'Carol'], 400)
    expect(msg).toContain('Alice')
    expect(msg).toContain('Carol')
    expect(msg).toContain('400')
  })

  it('mensagem inclui "Bolão do Revoada"', () => {
    const msg = overallChampionMessage(['X'], 100)
    expect(msg).toContain('Bolão do Revoada')
  })

  it('mensagem NÃO menciona mata-mata (é o Campeão Geral)', () => {
    const msg = overallChampionMessage(['X'], 100)
    expect(msg).not.toContain('mata-mata')
  })
})

describe('tournamentRequiredAlertMessage', () => {
  it('contém match_id e instrução de ação', () => {
    const msg = tournamentRequiredAlertMessage(84)
    expect(msg).toContain('84')
    expect(msg).toContain('Salvar e recalcular')
    expect(msg).toContain('⚠️')
  })
})
