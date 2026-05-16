// Mapeamento de código ISO 3166-1 alpha-3 → emoji de bandeira
// Cobre as 48 seleções da Copa 2026
export const countryFlags: Record<string, string> = {
  // Grupo A
  USA: '🇺🇸',
  MEX: '🇲🇽',
  CAN: '🇨🇦',
  // Grupo B
  ARG: '🇦🇷',
  CHI: '🇨🇱',
  PER: '🇵🇪',
  // Grupo C
  BRA: '🇧🇷',
  COL: '🇨🇴',
  URU: '🇺🇾',
  // Grupo D
  GER: '🇩🇪',
  POR: '🇵🇹',
  ESP: '🇪🇸',
  // Grupo E
  FRA: '🇫🇷',
  BEL: '🇧🇪',
  NED: '🇳🇱',
  // Grupo F
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  // Grupo G
  JPN: '🇯🇵',
  KOR: '🇰🇷',
  AUS: '🇦🇺',
  // Grupo H
  MAR: '🇲🇦',
  SEN: '🇸🇳',
  EGY: '🇪🇬',
  // Grupo I
  NGA: '🇳🇬',
  CMR: '🇨🇲',
  CIV: '🇨🇮',
  // Grupo J
  IRN: '🇮🇷',
  SAU: '🇸🇦',
  UAE: '🇦🇪',
  // Grupo K
  MEX2: '🇲🇽', // Placeholder pra times ainda a definir
  ECU: '🇪🇨',
  BOL: '🇧🇴',
  // Grupo L
  CRO: '🇭🇷',
  SVK: '🇸🇰',
  TUR: '🇹🇷',
  // Outros times qualificados
  SUI: '🇨🇭',
  DEN: '🇩🇰',
  SWE: '🇸🇪',
  NOR: '🇳🇴',
  AUT: '🇦🇹',
  POL: '🇵🇱',
  CZE: '🇨🇿',
  SRB: '🇷🇸',
  UKR: '🇺🇦',
  PAN: '🇵🇦',
  CRC: '🇨🇷',
  HON: '🇭🇳',
  JAM: '🇯🇲',
  VEN: '🇻🇪',
  PAR: '🇵🇾',
}

export function getFlagEmoji(countryCode: string): string {
  return countryFlags[countryCode.toUpperCase()] ?? '🏳'
}

// Converte código ISO 3166-1 alpha-2 → emoji de bandeira (fallback via regional indicator symbols)
export function alpha2ToFlag(alpha2: string): string {
  if (!alpha2 || alpha2.length !== 2) return '🏳'
  const codePoints = [...alpha2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}
