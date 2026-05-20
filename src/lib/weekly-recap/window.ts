// BRT = UTC-3, sem DST desde 2019
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000

export type RecapWindow = {
  startUtc: Date
  endUtc: Date
  isoYear: number
  isoWeek: number
}

function getIsoWeekData(dateBrt: Date): { isoYear: number; isoWeek: number } {
  // ISO 8601: semana começa na segunda, semana 1 contém a primeira quinta-feira
  const d = new Date(Date.UTC(dateBrt.getUTCFullYear(), dateBrt.getUTCMonth(), dateBrt.getUTCDate()))
  const dayNum = d.getUTCDay() || 7 // 1=Seg ... 7=Dom
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // Quinta-feira da semana ISO
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const isoWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return { isoYear: d.getUTCFullYear(), isoWeek }
}

/**
 * Calcula a janela de dados para o recap semanal.
 * Janela: [segunda anterior 00:00 BRT → now (segunda 22:00 BRT)]
 * Chamado quando now ≈ segunda 22:00 BRT (terça 01:00 UTC).
 */
export function getRecapWindow(now: Date): RecapWindow {
  // Converte now para BRT
  const nowBrt = new Date(now.getTime() - BRT_OFFSET_MS)

  // Dia da semana em BRT (0=Dom, 1=Seg, ..., 6=Sáb)
  const brtDow = nowBrt.getUTCDay()
  // Quantos dias se passaram desde segunda-feira em BRT
  const daysSinceMonday = brtDow === 0 ? 6 : brtDow - 1

  // Segunda-feira da semana atual em BRT (00:00 BRT)
  const thisMondayBrt = new Date(
    Date.UTC(
      nowBrt.getUTCFullYear(),
      nowBrt.getUTCMonth(),
      nowBrt.getUTCDate() - daysSinceMonday,
      0,
      0,
      0,
      0,
    ),
  )

  // Segunda-feira anterior = 7 dias antes
  const prevMondayBrt = new Date(thisMondayBrt.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Converte "segunda anterior 00:00 BRT" → UTC (BRT+3h = UTC)
  const startUtc = new Date(prevMondayBrt.getTime() + BRT_OFFSET_MS)

  const { isoYear, isoWeek } = getIsoWeekData(nowBrt)

  return { startUtc, endUtc: now, isoYear, isoWeek }
}
