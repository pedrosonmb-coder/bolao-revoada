// Mapping centralizado das 48 seleções da Copa 2026
// Chave: TLA FIFA (3 letras) — vem do banco, não alterar
// ENG e SCO usam emojis especiais de subdivisão (não deriváveis do iso2 via fórmula)
const SPECIAL_FLAGS: Record<string, string> = {
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
}

type TeamInfo = { name: string; iso2: string }

const TEAMS: Record<string, TeamInfo> = {
  ALG: { name: 'Argélia',          iso2: 'DZ' },
  ARG: { name: 'Argentina',        iso2: 'AR' },
  AUS: { name: 'Austrália',        iso2: 'AU' },
  AUT: { name: 'Áustria',          iso2: 'AT' },
  BEL: { name: 'Bélgica',          iso2: 'BE' },
  BIH: { name: 'Bósnia',           iso2: 'BA' },
  BRA: { name: 'Brasil',           iso2: 'BR' },
  CAN: { name: 'Canadá',           iso2: 'CA' },
  CIV: { name: 'Costa do Marfim',  iso2: 'CI' },
  COD: { name: 'Congo DR',         iso2: 'CD' },
  COL: { name: 'Colômbia',         iso2: 'CO' },
  CPV: { name: 'Cabo Verde',       iso2: 'CV' },
  CRO: { name: 'Croácia',          iso2: 'HR' },
  CUW: { name: 'Curaçao',          iso2: 'CW' },
  CZE: { name: 'Tchéquia',         iso2: 'CZ' },
  ECU: { name: 'Equador',          iso2: 'EC' },
  EGY: { name: 'Egito',            iso2: 'EG' },
  ENG: { name: 'Inglaterra',       iso2: '' },
  ESP: { name: 'Espanha',          iso2: 'ES' },
  FRA: { name: 'França',           iso2: 'FR' },
  GER: { name: 'Alemanha',         iso2: 'DE' },
  GHA: { name: 'Gana',             iso2: 'GH' },
  HAI: { name: 'Haiti',            iso2: 'HT' },
  IRN: { name: 'Irã',              iso2: 'IR' },
  IRQ: { name: 'Iraque',           iso2: 'IQ' },
  JOR: { name: 'Jordânia',         iso2: 'JO' },
  JPN: { name: 'Japão',            iso2: 'JP' },
  KOR: { name: 'Coreia do Sul',    iso2: 'KR' },
  KSA: { name: 'Arábia Saudita',   iso2: 'SA' },
  MAR: { name: 'Marrocos',         iso2: 'MA' },
  MEX: { name: 'México',           iso2: 'MX' },
  NED: { name: 'Holanda',           iso2: 'NL' },
  NOR: { name: 'Noruega',          iso2: 'NO' },
  NZL: { name: 'Nova Zelândia',    iso2: 'NZ' },
  PAN: { name: 'Panamá',           iso2: 'PA' },
  PAR: { name: 'Paraguai',         iso2: 'PY' },
  POR: { name: 'Portugal',         iso2: 'PT' },
  QAT: { name: 'Catar',            iso2: 'QA' },
  RSA: { name: 'África do Sul',    iso2: 'ZA' },
  SCO: { name: 'Escócia',          iso2: '' },
  SEN: { name: 'Senegal',          iso2: 'SN' },
  SUI: { name: 'Suíça',            iso2: 'CH' },
  SWE: { name: 'Suécia',           iso2: 'SE' },
  TUN: { name: 'Tunísia',          iso2: 'TN' },
  TUR: { name: 'Turquia',          iso2: 'TR' },
  URU: { name: 'Uruguai',          iso2: 'UY' }, // alias — football-data.org usa URU nos jogos futuros
  URY: { name: 'Uruguai',          iso2: 'UY' }, // mantido — match_id=15 já gravado usa URY
  USA: { name: 'EUA',              iso2: 'US' },
  UZB: { name: 'Uzbequistão',      iso2: 'UZ' },
}

function computeFlag(iso2: string): string {
  if (iso2.length !== 2) return '🏳️'
  const A = 0x1f1e6
  return iso2
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(A + c.charCodeAt(0) - 65))
    .join('')
}

export function getTeamDisplay(tla: string): { name: string; flag: string } {
  const key = tla.toUpperCase()
  const team = TEAMS[key]
  if (!team) {
    console.warn(`[teams] código sem mapeamento: "${tla}"`)
    return { name: tla, flag: '🏳️' }
  }
  const flag = SPECIAL_FLAGS[key] ?? computeFlag(team.iso2)
  return { name: team.name, flag }
}

export function getTeamName(tla: string): string | null {
  return TEAMS[tla.toUpperCase()]?.name ?? null
}

export function getAllTeams(): { tla: string; name: string; flag: string }[] {
  return Object.entries(TEAMS)
    .map(([tla, info]) => ({
      tla,
      name: info.name,
      flag: SPECIAL_FLAGS[tla] ?? computeFlag(info.iso2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}
