export async function retryRecalculate(
  matchId: number,
  fn: (id: number) => Promise<{ updated: number }>,
  delayMs = 1000
): Promise<{ updated: number } | null> {
  try {
    return await fn(matchId)
  } catch (firstErr) {
    console.warn(
      `[reconciliation] match ${matchId} recalculation failed (attempt 1), retrying in ${delayMs}ms:`,
      firstErr
    )
    await new Promise((r) => setTimeout(r, delayMs))
    try {
      return await fn(matchId)
    } catch (secondErr) {
      console.error(
        `[reconciliation] CRITICAL: match ${matchId} LOCKED but recalculation FAILED after 2 attempts. ` +
          `stale-check will alert admin.`,
        secondErr
      )
      return null
    }
  }
}
