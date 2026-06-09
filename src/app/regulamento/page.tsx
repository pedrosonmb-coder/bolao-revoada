'use client'

import { useEffect } from 'react'
import { BackButton } from '@/components/layout/back-button'

export default function RegulamentoPage() {
  useEffect(() => {
    // Segue tema do Telegram
    const tg = window.Telegram?.WebApp
    if (tg) {
      document.documentElement.classList.toggle('dark', tg.colorScheme === 'dark')
    }
  }, [])

  return (
    <main className="min-h-screen bg-(--color-bg-base) text-(--color-text-primary) font-[family-name:var(--font-inter)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackButton fallbackHref="/mais" />

        <h1 className="font-[family-name:var(--font-inter-tight)] font-black text-2xl uppercase mb-2">
          Regulamento
        </h1>
        <p className="text-(--color-text-secondary) text-sm mb-8">
          Bolão do Revoada — Copa do Mundo FIFA 2026
        </p>

        {/* Seção 1 — Como palpitar */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">1. Como palpitar</h2>
          <ul className="text-sm space-y-2 text-(--color-text-secondary)">
            <li>Você palpita o placar de todos os 104 jogos da Copa.</li>
            <li>
              Cada jogo fecha para palpite{' '}
              <span className="font-medium text-(--color-text-primary)">5 minutos antes do seu início</span>.
              Depois disso, trava.
            </li>
            <li>Você pode palpitar no seu ritmo, jogo a jogo — não precisa fazer todos de uma vez.</li>
            <li>
              Os palpites de torneio (campeão, vice, semifinalistas, artilheiro, melhor jogador,
              melhor jovem) fecham todos juntos{' '}
              <span className="font-medium text-(--color-text-primary)">5 minutos antes do primeiro jogo da Copa</span>.
              Não dá para editar depois que a Copa começa.
            </li>
          </ul>
        </section>

        {/* Seção 2 — Pontuação por jogo */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">2. Pontuação por jogo</h2>
          <p className="text-sm text-(--color-text-secondary) mb-3">
            Você ganha pontos conforme a precisão do palpite. Só o melhor nível se aplica por jogo.
          </p>
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="border-b border-(--color-border-base)">
                <th className="text-left py-2 font-medium">Acerto</th>
                <th className="text-right py-2 font-medium">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Placar exato', '25', 'acertou o placar cravado'],
                ['Vencedor + saldo de gols', '18', 'acertou quem ganhou e a diferença de gols, mas não o placar'],
                ['Vencedor + gols do vencedor', '15', 'acertou quem ganhou e quantos gols o vencedor fez'],
                ['Vencedor + gols do perdedor', '12', 'acertou quem ganhou e quantos gols o perdedor fez'],
                ['Só o vencedor (ou só o empate)', '10', 'acertou o resultado, errou os gols'],
                ['Errou', '0', ''],
              ].map(([acerto, pts, desc]) => (
                <tr key={acerto} className="border-b border-(--color-border-base) last:border-0">
                  <td className="py-2 text-(--color-text-primary)">
                    {acerto}
                    {desc && (
                      <span className="block text-xs text-(--color-text-secondary) font-normal">{desc}</span>
                    )}
                  </td>
                  <td className="py-2 text-right font-[family-name:var(--font-inter-tight)] font-bold align-top">
                    {pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm italic text-(--color-text-secondary) border-l-2 border-(--color-border-base) pl-3">
            Exemplo: jogo termina Brasil 2×1. Você palpitou 3×1 → acertou o vencedor e os gols do
            perdedor = 12 pts. Se tivesse palpitado 2×0 → acertou vencedor e gols do vencedor = 15 pts.
            Se palpitou 2×1 → placar exato = 25 pts.
          </p>
        </section>

        {/* Seção 3 — Empates */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">3. Empates</h2>
          <ul className="text-sm space-y-2 text-(--color-text-secondary)">
            <li>
              <span className="font-medium text-(--color-text-primary)">Fase de grupos:</span>{' '}
              se o jogo empata e você palpitou empate, pontua normalmente (placar exato = 25, só o empate = 10).
            </li>
            <li>
              <span className="font-medium text-(--color-text-primary)">Mata-mata:</span>{' '}
              se você palpita empate, precisa escolher qual seleção se classifica (nos pênaltis).
              O app pede essa escolha automaticamente.
            </li>
          </ul>
        </section>

        {/* Seção 4 — Multiplicadores */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">4. Multiplicadores por fase</h2>
          <p className="text-sm text-(--color-text-secondary) mb-3">
            Os pontos do jogo são multiplicados conforme a fase:
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-(--color-border-base)">
                <th className="text-left py-2 font-medium">Fase</th>
                <th className="text-right py-2 font-medium">Multiplicador</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Fase de grupos', '×1'],
                ['16-avos (R32)', '×1,5'],
                ['Oitavas de final', '×2'],
                ['Quartas de final', '×2'],
                ['Semifinais', '×2'],
                ['Disputa de 3º lugar', '×2'],
                ['Final', '×2,5'],
              ].map(([fase, mult]) => (
                <tr key={fase} className="border-b border-(--color-border-base) last:border-0">
                  <td className="py-2">{fase}</td>
                  <td className="py-2 text-right font-[family-name:var(--font-inter-tight)] font-bold">
                    {mult}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Seção 5 — Bônus de classificação */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">5. Bônus de classificação (só no mata-mata)</h2>
          <ul className="text-sm space-y-2 text-(--color-text-secondary) mb-4">
            <li>
              A partir dos 16-avos, se você acertar qual seleção se classifica{' '}
              <span className="font-medium text-(--color-text-primary)">E acertar o placar</span>,
              ganha <span className="font-medium text-(--color-text-primary)">+5 pts de bônus</span>.
            </li>
            <li>O bônus é somado antes do multiplicador da fase.</li>
            <li>
              <span className="font-medium text-(--color-text-primary)">Atenção:</span>{' '}
              se você errar o placar, não ganha o bônus, mesmo acertando quem passou.
            </li>
          </ul>
          <p className="text-sm italic text-(--color-text-secondary) border-l-2 border-(--color-border-base) pl-3">
            Exemplo: nas oitavas (×2), você acerta o placar exato (25) e a seleção que classifica (+5)
            = (25+5) × 2 = 60 pts. Na final (×2,5), placar exato + classificação = (25+5) × 2,5 = 75 pts.
          </p>
        </section>

        {/* Seção 6 — Palpites de torneio */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">6. Palpites de torneio</h2>
          <p className="text-sm text-(--color-text-secondary) mb-3">
            Feitos antes da Copa começar. Pontuam no fim:
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-(--color-border-base)">
                <th className="text-left py-2 font-medium">Palpite</th>
                <th className="text-right py-2 font-medium">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Campeão', '100'],
                ['Vice-campeão', '50'],
                ['Cada semifinalista (além de campeão e vice)', '25'],
                ['Artilheiro', '50'],
                ['Melhor jogador', '50'],
                ['Melhor jovem', '25'],
              ].map(([palpite, pts]) => (
                <tr key={palpite} className="border-b border-(--color-border-base) last:border-0">
                  <td className="py-2">{palpite}</td>
                  <td className="py-2 text-right font-[family-name:var(--font-inter-tight)] font-bold">
                    {pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-(--color-text-secondary) mt-3">
            Máximo possível no torneio:{' '}
            <span className="font-[family-name:var(--font-inter-tight)] font-bold text-(--color-text-primary)">
              325 pts
            </span>{' '}
            (100 + 50 + 25×2 + 50 + 50 + 25)
          </p>
        </section>

        {/* Seção 7 — Ranking e desempate */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">7. Ranking e desempate</h2>
          <p className="text-sm text-(--color-text-secondary) mb-3">
            Em caso de empate de pontos, o desempate segue esta ordem:
          </p>
          <ol className="text-sm space-y-1 text-(--color-text-secondary) list-decimal list-inside">
            <li>Total de pontos</li>
            <li>Número de vencedores acertados</li>
            <li>Número de placares exatos</li>
            <li>Pontos dos palpites de torneio</li>
            <li>Quem palpitou primeiro</li>
          </ol>
        </section>

        {/* Seção 8 — Premiação */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">8. Premiação</h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ['1º lugar', '70% do bolo'],
                ['2º lugar', '20% do bolo'],
                ['3º lugar', '10% do bolo'],
              ].map(([pos, valor]) => (
                <tr key={pos} className="border-b border-(--color-border-base) last:border-0">
                  <td className="py-2 font-medium">{pos}</td>
                  <td className="py-2 text-right font-[family-name:var(--font-inter-tight)] font-bold">
                    {valor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-(--color-text-secondary) mt-3">
            O valor atualizado fica na aba{' '}
            <span className="font-medium text-(--color-text-primary)">Prêmio</span> do app.
          </p>
        </section>

        {/* Seção 9 — Pagamento */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">9. Pagamento</h2>
          <ul className="text-sm space-y-1 text-(--color-text-secondary)">
            <li>Entrada de <span className="font-medium text-(--color-text-primary)">R$ 100</span> por participante.</li>
            <li>Os palpites só são validados após confirmação do pagamento.</li>
          </ul>
        </section>

        <div className="border-t border-(--color-border-base) pt-4 text-xs text-(--color-text-secondary)">
          Bolão do Revoada — Copa do Mundo FIFA 2026
        </div>
      </div>
    </main>
  )
}
