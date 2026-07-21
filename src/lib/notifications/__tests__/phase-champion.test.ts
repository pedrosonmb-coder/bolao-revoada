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

describe('overallChampionMessage (Campeão Geral do Bolão — pódio)', () => {
  const podium3 = [
    { names: ['Bob'], points: 487 },
    { names: ['Alice'], points: 400 },
    { names: ['Carol'], points: 350 },
  ]

  it('pódio de 3: contém os 3 nomes, os 3 pontos e as 3 medalhas', () => {
    const msg = overallChampionMessage(podium3, 13)
    expect(msg).toContain('Bob')
    expect(msg).toContain('487')
    expect(msg).toContain('Alice')
    expect(msg).toContain('400')
    expect(msg).toContain('Carol')
    expect(msg).toContain('350')
    expect(msg).toContain('🥇')
    expect(msg).toContain('🥈')
    expect(msg).toContain('🥉')
  })

  it('1º lugar aparece antes do 2º e do 3º na mensagem', () => {
    const msg = overallChampionMessage(podium3, 13)
    expect(msg.indexOf('Bob')).toBeLessThan(msg.indexOf('Alice'))
    expect(msg.indexOf('Alice')).toBeLessThan(msg.indexOf('Carol'))
  })

  it('empate numa posição: junta os nomes com " e " na mesma linha', () => {
    const podiumWithTie = [
      { names: ['Alice', 'Carol'], points: 400 },
      { names: ['Bob'], points: 350 },
    ]
    const msg = overallChampionMessage(podiumWithTie, 13)
    expect(msg).toContain('Alice e Carol')
    expect(msg).toContain('400')
  })

  it('pódio com só 2 entradas (ex: empate no 1º pula a posição 2) renderiza normalmente', () => {
    const podiumWith2 = [
      { names: ['Alice', 'Bob'], points: 400 },
      { names: ['Carol'], points: 300 },
    ]
    const msg = overallChampionMessage(podiumWith2, 13)
    expect(msg).toContain('🥇')
    expect(msg).toContain('🥈')
    expect(msg).not.toContain('🥉')
  })

  it('mensagem inclui "Bolão do Revoada" e "resultado final"', () => {
    const msg = overallChampionMessage(podium3, 13)
    expect(msg).toContain('Bolão do Revoada')
    expect(msg).toContain('resultado final')
  })

  it('mensagem inclui o convite à auditoria (transparência da pontuação)', () => {
    const msg = overallChampionMessage(podium3, 13)
    expect(msg).toContain('base × multiplicador')
    expect(msg).toContain('ranking')
  })

  it('mensagem inclui a contagem real de participantes', () => {
    const msg = overallChampionMessage(podium3, 13)
    expect(msg).toContain('todos os 13')
  })

  it('mensagem NÃO menciona mata-mata (é o Campeão Geral)', () => {
    const msg = overallChampionMessage(podium3, 13)
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
