# Fontes de Dados — Fase 2

O sistema busca placares em 4 fontes redundantes. A lógica de reconciliação garante que um resultado só é oficializado quando ≥2 fontes concordam por 10 verificações consecutivas.

## As 4 fontes

### 1. football-data.org (primária)
- **Endpoint:** `https://api.football-data.org/v4/matches/<fd_id>`
- **Latência:** ~200ms
- **Estabilidade:** Alta — API documentada, SLA implícito
- **Autenticação:** Header `X-Auth-Token` (variável `FOOTBALL_DATA_API_KEY`)
- **Rate limit:** Plano free: 10 req/min. Com o batching de 5 jogos por vez, fica dentro do limite.
- **Retry:** 3 tentativas com backoff 500ms / 1s / 2s. 429 → aguarda 60s.

### 2. FIFA API (confirmação)
- **Endpoint:** `${FIFA_API_BASE}/calendar/matches/<fifa_id>`
- **Latência:** ~300ms
- **Estabilidade:** Média — estrutura pode mudar sem aviso
- **Autenticação:** Nenhuma (API pública)
- **Nota:** Esta fonte é opcional. Se retornar null consistentemente, o sistema funciona com as demais.

### 3. ge.globo.com (terceira camada, scraping)
- **Estratégia:** Busca página de jogos do dia e extrai JSON-LD (`<script type="application/ld+json">`) com Schema.org SportsEvent
- **Latência:** ~500ms
- **Estabilidade:** Baixa — depende do HTML da Globo não mudar
- **Retry:** 1 tentativa extra (sem delay)
- **Nota:** Falha silenciosa se a Globo mudar o layout. Aceitar null.

### 4. Wikipedia (rede de segurança)
- **Endpoint:** `https://pt.wikipedia.org/w/api.php` — wikitext da página da Copa 2026
- **Latência:** ~800ms
- **Estabilidade:** Muito baixa — parser frágil baseado em regex
- **Retry:** Nenhum
- **Nota:** Retorna null na maioria dos jogos. Só serve como última linha de defesa.

---

## Como a reconciliação funciona

**Arquivo:** [src/lib/reconciliation.ts](../src/lib/reconciliation.ts)

1. **Fase 1:** football-data + FIFA em paralelo (timeout 5s cada)
2. Se ≥2 concordam em `(home_score, away_score, status)` → resultado `agreed`
3. Se discordam: busca ge + wikipedia em paralelo
4. Reavalia todas as fontes que responderam:
   - ≥2 concordam → `agreed`
   - 1 só respondeu → `partial` (mostra o dado, não lockeia)
   - ≥2 responderam mas divergem → `conflict` (não atualiza o banco)
   - Nenhuma respondeu → `all_failed`

**Locking:** Resultado é oficializado (`result_locked_at`) quando:
- Status = `finished`
- ≥2 fontes concordam (kind = `agreed`)
- 10 snapshots consecutivos no banco têm o mesmo placar final

---

## Como debugar um conflito

1. Acesse `/api/admin/polling-status` com o header `x-admin-id: <telegram_id>`
2. O campo `conflicts` lista os jogos com divergência, com os snapshots inline
3. Para investigar um jogo específico, consulte a tabela `match_snapshots`:
   ```sql
   SELECT source, status, home_score, away_score, fetched_at
   FROM match_snapshots
   WHERE match_id = <id>
   ORDER BY fetched_at DESC
   LIMIT 20;
   ```

---

## Como rodar o seed manualmente

```bash
pnpm seed:matches
```

O script:
1. Busca os 104 jogos da Copa 2026 na football-data.org
2. Faz upsert por `fd_id` (seguro rodar mais de uma vez)
3. Popula a tabela `phase_windows` com as 6 janelas de palpite
4. Valida a distribuição por fase — termina com exit 1 se errada

---

## Como adicionar uma 5ª fonte no futuro

1. Crie `src/lib/data-sources/nova-fonte.ts` implementando uma função que retorna `MatchSnapshot | null`
2. Importe-a em [src/lib/reconciliation.ts](../src/lib/reconciliation.ts)
3. Adicione-a à Fase 2 do `reconcileMatch` (junto com ge e wikipedia)
4. O tipo `DataSource` em [src/lib/data-sources/types.ts](../src/lib/data-sources/types.ts) precisa incluir o novo source name

A interface é intencionalemente simples: uma função async que retorna `MatchSnapshot | null`. Timeout e retry ficam encapsulados dentro da própria fonte.
