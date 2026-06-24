import { describe, it, expect } from 'vitest'
import { resolveChampionBlock } from '../phase-champion-block'
import { phaseChampionMessage } from '@/lib/telegram/messages'

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
    // Garante que só os 7 stages válidos retornam não-null
    const validStages = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']
    for (const s of validStages) {
      expect(resolveChampionBlock(s)).not.toBeNull()
    }
  })
})

describe('phaseChampionMessage', () => {
  it('group — único campeão', () => {
    const msg = phaseChampionMessage('group', ['Alice'], 347)
    expect(msg).toContain('Fase de grupos encerrada')
    expect(msg).toContain('Alice')
    expect(msg).toContain('347')
    expect(msg).toContain('🏆')
  })

  it('knockout — único campeão', () => {
    const msg = phaseChampionMessage('knockout', ['Bob'], 234)
    expect(msg).toContain('mata-mata')
    expect(msg).toContain('Bob')
    expect(msg).toContain('234')
    expect(msg).toContain('🏆')
  })

  it('group — empate: ambos os nomes na mensagem', () => {
    const msg = phaseChampionMessage('group', ['Alice', 'Bob'], 300)
    expect(msg).toContain('Alice')
    expect(msg).toContain('Bob')
    expect(msg).toContain('300')
  })

  it('knockout — empate: ambos os nomes na mensagem', () => {
    const msg = phaseChampionMessage('knockout', ['Alice', 'Carol'], 180)
    expect(msg).toContain('Alice')
    expect(msg).toContain('Carol')
  })

  it('group e knockout têm textos diferentes', () => {
    const group = phaseChampionMessage('group', ['X'], 100)
    const knockout = phaseChampionMessage('knockout', ['X'], 100)
    expect(group).not.toBe(knockout)
  })
})
