'use client'

import { useEffect } from 'react'

function BackButton() {
  function handleBack() {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.close()
    } else {
      history.back()
    }
  }

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1 text-sm text-[#737373] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] mb-6"
    >
      ← Voltar
    </button>
  )
}

export default function RegulamentoPage() {
  useEffect(() => {
    // Segue tema do Telegram
    const tg = window.Telegram?.WebApp
    if (tg) {
      document.documentElement.classList.toggle('dark', tg.colorScheme === 'dark')
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#FFFFFF] dark:bg-[#0A0A0A] text-[#0A0A0A] dark:text-[#FAFAFA] font-[family-name:var(--font-inter)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackButton />

        <h1 className="font-[family-name:var(--font-inter-tight)] font-black text-2xl uppercase mb-6">
          Regulamento
        </h1>

        <p className="text-[#737373] text-sm mb-8">
          Bolão do Revoada — Copa do Mundo FIFA 2026. 10 participantes, R$ 1.000 em jogo, 104 jogos.
        </p>

        {/* 4.1 Pontuação — fase de grupos */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">Pontuação por jogo — fase de grupos</h2>
          <p className="text-sm text-[#737373] mb-3">
            Hierárquica: só o melhor critério atingido conta.
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
                <th className="text-left py-2 font-medium">Acerto</th>
                <th className="text-right py-2 font-medium">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Placar exato', '25'],
                ['Vencedor + saldo correto', '18'],
                ['Vencedor + gols do vencedor corretos', '15'],
                ['Vencedor + gols do perdedor corretos', '12'],
                ['Só o vencedor (ou só o empate)', '10'],
                ['Errou o vencedor', '0'],
              ].map(([acerto, pts]) => (
                <tr
                  key={acerto}
                  className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0"
                >
                  <td className="py-2 text-[#0A0A0A] dark:text-[#FAFAFA]">{acerto}</td>
                  <td className="py-2 text-right font-[family-name:var(--font-inter-tight)] font-bold">
                    {pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 4.2 Mata-mata */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">Pontuação no mata-mata</h2>
          <p className="text-sm text-[#737373]">
            Mesma tabela acima <span className="font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">+ 5 pontos</span> se acertou quem se classificou, independente do placar.
          </p>
        </section>

        {/* 4.3 Multiplicadores */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">Multiplicadores por fase</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
                <th className="text-left py-2 font-medium">Fase</th>
                <th className="text-right py-2 font-medium">Multiplicador</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Fase de grupos', '×1'],
                ['16-avos (r32)', '×1,5'],
                ['Oitavas (r16)', '×2'],
                ['Quartas (qf)', '×2,5'],
                ['Semifinais (sf)', '×3'],
                ['Disputa de 3º lugar', '×2'],
                ['Final', '×4'],
              ].map(([fase, mult]) => (
                <tr
                  key={fase}
                  className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0"
                >
                  <td className="py-2">{fase}</td>
                  <td className="py-2 text-right font-[family-name:var(--font-inter-tight)] font-bold">
                    {mult}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 4.4 Palpites de torneio */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">Palpites de torneio</h2>
          <p className="text-sm text-[#737373] mb-3">Feitos antes do apito inicial. Máximo: 375 pts.</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#2A2A2A]">
                <th className="text-left py-2 font-medium">Palpite</th>
                <th className="text-right py-2 font-medium">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Campeão', '100'],
                ['Vice-campeão', '50'],
                ['Cada semifinalista (até 4)', '25'],
                ['Artilheiro da Copa', '50'],
                ['Melhor jogador (Bola de Ouro Adidas)', '50'],
                ['Melhor jovem (Young Player Award FIFA)', '25'],
              ].map(([palpite, pts]) => (
                <tr
                  key={palpite}
                  className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0"
                >
                  <td className="py-2">{palpite}</td>
                  <td className="py-2 text-right font-[family-name:var(--font-inter-tight)] font-bold">
                    {pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 4.5 Janelas de palpite */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">Janelas de palpite</h2>
          <ul className="text-sm space-y-2 text-[#737373]">
            <li>
              <span className="font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">Torneio + grupos:</span>{' '}
              01/06/2026 até 5 min antes do jogo de abertura (11/06/2026)
            </li>
            <li>
              <span className="font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">Demais fases:</span>{' '}
              abrem após o último jogo da fase anterior, fecham 5 min antes do primeiro jogo da próxima
            </li>
          </ul>
          <p className="text-sm text-[#737373] mt-3">
            Após fechamento, palpite é imutável. Não palpitou = 0 pontos.
          </p>
        </section>

        {/* 4.6 Pagamento */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">Pagamento de inscrição</h2>
          <ul className="text-sm space-y-1 text-[#737373]">
            <li>R$ 100 por participante via Pix</li>
            <li>Prazo: até 10/06/2026 23h59 (horário de Brasília)</li>
            <li>Quem não pagou no prazo: bloqueado do bolão, fora do ranking</li>
          </ul>
        </section>

        {/* 4.7 Regras operacionais */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">Regras operacionais</h2>
          <ul className="text-sm space-y-1 text-[#737373]">
            <li>Prorrogação conta para placar; pênaltis não contam (só para bônus de classificação)</li>
            <li>Palpites alheios ficam ocultos até o apito inicial do jogo</li>
            <li>Resultado oficial: ≥ 2 fontes concordando por 10 min consecutivos</li>
            <li>Todos os horários exibidos no fuso de Brasília (UTC−3)</li>
          </ul>
        </section>

        {/* 4.8 Desempate */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">Critérios de desempate</h2>
          <ol className="text-sm space-y-1 text-[#737373] list-decimal list-inside">
            <li>Mais vencedores acertados</li>
            <li>Mais placares exatos</li>
            <li>Mais pontos em palpites de torneio</li>
            <li>Quem palpitou primeiro (fase de grupos, ordem cronológica)</li>
            <li>Cara ou coroa</li>
          </ol>
        </section>

        {/* 4.9 Premiação */}
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">Premiação</h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ['1º lugar', 'R$ 700', '70%'],
                ['2º lugar', 'R$ 200', '20%'],
                ['3º lugar', 'R$ 100', '10%'],
              ].map(([pos, valor, pct]) => (
                <tr
                  key={pos}
                  className="border-b border-[#E5E5E5] dark:border-[#2A2A2A] last:border-0"
                >
                  <td className="py-2 font-medium">{pos}</td>
                  <td className="py-2 font-[family-name:var(--font-inter-tight)] font-bold">{valor}</td>
                  <td className="py-2 text-right text-[#737373]">{pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-[#737373] mt-3">
            Pagamento em até 7 dias úteis após a apuração final.
          </p>
        </section>

        <div className="border-t border-[#E5E5E5] dark:border-[#2A2A2A] pt-4 text-xs text-[#737373]">
          Bolão do Revoada — Copa do Mundo FIFA 2026
        </div>
      </div>
    </main>
  )
}
