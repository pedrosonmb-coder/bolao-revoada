import Anthropic from '@anthropic-ai/sdk'
import { buildRecapPrompt } from './build-prompt'
import type { WeeklyRecapData } from './collect-data'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 800
const TEMPERATURE = 0.9
const TIMEOUT_MS = 30_000
const RETRY_DELAYS_MS = [1_000, 4_000] // 2 tentativas após falha inicial

// Custo aproximado por token (USD) — Haiku 4.5 preços públicos
const COST_PER_INPUT_TOKEN = 1.0 / 1_000_000
const COST_PER_OUTPUT_TOKEN = 5.0 / 1_000_000

export type GenerateResult =
  | { text: string; tokensIn: number; tokensOut: number; costUsd: number; latencyMs: number }
  | { error: string }

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return err.status >= 500 || err.status === 429
  }
  // AbortError de timeout → retentável
  if (err instanceof Error && err.name === 'AbortError') return true
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callAnthropic(
  client: Anthropic,
  system: string,
  user: string,
): Promise<Anthropic.Message> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system,
        messages: [{ role: 'user', content: user }],
      },
      { signal: controller.signal },
    )
  } finally {
    clearTimeout(timer)
  }
}

export async function generateWeeklyRecap(data: WeeklyRecapData): Promise<GenerateResult> {
  const client = new Anthropic()
  const { system, user } = buildRecapPrompt(data)

  let lastErr: unknown
  const start = Date.now()

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1])
    }

    try {
      const msg = await callAnthropic(client, system, user)
      const latencyMs = Date.now() - start

      const firstBlock = msg.content[0]
      if (!firstBlock || firstBlock.type !== 'text') {
        return { error: 'resposta da API sem bloco de texto' }
      }

      const tokensIn = msg.usage.input_tokens
      const tokensOut = msg.usage.output_tokens
      const costUsd = tokensIn * COST_PER_INPUT_TOKEN + tokensOut * COST_PER_OUTPUT_TOKEN

      console.log(
        JSON.stringify({
          event: 'weekly_recap_generated',
          model: MODEL,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          cost_usd: costUsd.toFixed(6),
          latency_ms: latencyMs,
          attempt: attempt + 1,
        }),
      )

      return { text: firstBlock.text, tokensIn, tokensOut, costUsd, latencyMs }
    } catch (err) {
      lastErr = err
      const isLast = attempt === RETRY_DELAYS_MS.length

      console.error(
        JSON.stringify({
          event: 'weekly_recap_api_error',
          attempt: attempt + 1,
          retryable: isRetryable(err),
          error: err instanceof Error ? err.message : String(err),
          will_retry: !isLast && isRetryable(err),
        }),
      )

      if (!isRetryable(err) || isLast) break
    }
  }

  const errorMsg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  return { error: errorMsg }
}
