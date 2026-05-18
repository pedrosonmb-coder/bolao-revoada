import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import { db } from '@/lib/db'
import { users, matches, predictions } from '@/lib/db/schema'
import { eq, gt, asc, sql, sum } from 'drizzle-orm'
import { env } from '@/lib/env'
import { isUserInGroup } from '../group-check'
import {
  welcomeMessage,
  rankingMessage,
  myPointsMessage,
  nextMatchMessage,
  dailyMatchesMessage,
  notInGroupMessage,
  inactiveUserMessage,
  helpMessage,
  wrongGroupMessage,
  type BotRankingEntry,
} from '../messages'

function isGroupChat(ctx: Context): boolean {
  return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup'
}

function isOfficialGroup(ctx: Context): boolean {
  return String(ctx.chat?.id) === env.TELEGRAM_GROUP_CHAT_ID
}

async function guardCommand(ctx: Context): Promise<boolean> {
  if (isGroupChat(ctx) && !isOfficialGroup(ctx)) {
    await ctx.reply(wrongGroupMessage())
    return false
  }

  const telegramUser = ctx.from
  if (!telegramUser) return false

  const inGroup = await isUserInGroup(telegramUser.id)
  if (!inGroup) {
    await ctx.reply(notInGroupMessage())
    return false
  }

  return true
}

export async function handleStart(ctx: Context): Promise<void> {
  const telegramUser = ctx.from
  if (!telegramUser) return

  if (isGroupChat(ctx)) {
    await ctx.reply('Esse comando funciona melhor em DM com o bot.')
    return
  }

  const inGroup = await isUserInGroup(telegramUser.id)
  if (!inGroup) {
    await ctx.reply(notInGroupMessage())
    return
  }

  // Upsert do usuário
  await db
    .insert(users)
    .values({
      telegram_id: telegramUser.id,
      telegram_username: telegramUser.username ?? null,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name ?? null,
    })
    .onConflictDoUpdate({
      target: users.telegram_id,
      set: {
        telegram_username: telegramUser.username ?? null,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name ?? null,
        updated_at: new Date(),
      },
    })

  const [user] = await db.select().from(users).where(eq(users.telegram_id, telegramUser.id))

  if (!user?.is_active) {
    await ctx.reply(inactiveUserMessage())
    return
  }

  const keyboard = new InlineKeyboard().webApp('🎯 Abrir Bolão', env.NEXT_PUBLIC_APP_URL)
  await ctx.reply(welcomeMessage(telegramUser.first_name), { reply_markup: keyboard })
}

export async function handlePalpitar(ctx: Context): Promise<void> {
  if (isGroupChat(ctx)) {
    await ctx.reply('Esse comando funciona melhor em DM com o bot.')
    return
  }

  const ok = await guardCommand(ctx)
  if (!ok) return

  const url = `${env.NEXT_PUBLIC_APP_URL}?tab=palpitar`
  const keyboard = new InlineKeyboard().webApp('🎯 Abrir palpites', url)
  await ctx.reply('Palpites abertos. Toque pra abrir o app.', { reply_markup: keyboard })
}

export async function handleRanking(ctx: Context): Promise<void> {
  const ok = await guardCommand(ctx)
  if (!ok) return

  const rows = await db
    .select({
      first_name: users.first_name,
      telegram_username: users.telegram_username,
      total_points: sum(predictions.points_awarded),
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.user_id, users.id))
    .where(eq(users.is_active, true))
    .groupBy(users.id, users.first_name, users.telegram_username)
    .orderBy(sql`sum(${predictions.points_awarded}) DESC NULLS LAST`)
    .limit(10)

  const rankings: BotRankingEntry[] = rows.map((r, i) => ({
    first_name: r.first_name,
    telegram_username: r.telegram_username,
    total_points: Number(r.total_points ?? 0),
    position: i + 1,
  }))

  const url = `${env.NEXT_PUBLIC_APP_URL}?tab=ranking`
  const keyboard = isGroupChat(ctx) ? undefined : new InlineKeyboard().webApp('Ver detalhes', url)
  await ctx.reply(rankingMessage(rankings), keyboard ? { reply_markup: keyboard } : {})
}

export async function handleMeusPontos(ctx: Context): Promise<void> {
  const ok = await guardCommand(ctx)
  if (!ok) return

  const telegramUser = ctx.from!

  const [user] = await db.select().from(users).where(eq(users.telegram_id, telegramUser.id))
  if (!user) {
    await ctx.reply('Você ainda não está cadastrado. Manda /start primeiro.')
    return
  }

  const [result] = await db
    .select({ total: sum(predictions.points_awarded) })
    .from(predictions)
    .where(eq(predictions.user_id, user.id))

  const total = Number(result?.total ?? 0)

  const text = myPointsMessage(user, total)
  const url = `${env.NEXT_PUBLIC_APP_URL}?tab=ranking`
  const keyboard = isGroupChat(ctx) ? undefined : new InlineKeyboard().webApp('Ver detalhes', url)
  await ctx.reply(text, keyboard ? { reply_markup: keyboard } : {})
}

export async function handleProximo(ctx: Context): Promise<void> {
  const ok = await guardCommand(ctx)
  if (!ok) return

  const [match] = await db
    .select()
    .from(matches)
    .where(sql`${matches.kickoff_at} > ${new Date()} AND ${matches.status} = 'scheduled'`)
    .orderBy(asc(matches.kickoff_at))
    .limit(1)

  if (!match) {
    await ctx.reply('Acabou. Vai estudar.')
    return
  }

  let userPrediction = undefined
  const telegramUser = ctx.from!
  const [user] = await db.select().from(users).where(eq(users.telegram_id, telegramUser.id))
  if (user) {
    const [pred] = await db
      .select()
      .from(predictions)
      .where(sql`${predictions.user_id} = ${user.id} AND ${predictions.match_id} = ${match.id}`)
    userPrediction = pred
  }

  const url = `${env.NEXT_PUBLIC_APP_URL}?tab=palpitar&match=${match.id}`
  const keyboard = isGroupChat(ctx) ? undefined : new InlineKeyboard().webApp('🎯 Palpitar', url)
  await ctx.reply(nextMatchMessage(match, userPrediction), keyboard ? { reply_markup: keyboard } : {})
}

export async function handleJogosDoDia(ctx: Context): Promise<void> {
  const ok = await guardCommand(ctx)
  if (!ok) return

  const todayMatches = await db
    .select()
    .from(matches)
    .where(
      sql`DATE(datetime(${matches.kickoff_at} / 1000, 'unixepoch', '-3 hours')) = DATE('now', '-3 hours')`
    )
    .orderBy(asc(matches.kickoff_at))

  await ctx.reply(dailyMatchesMessage(todayMatches))
}

export async function handleRegulamento(ctx: Context): Promise<void> {
  const ok = await guardCommand(ctx)
  if (!ok) return

  const url = `${env.NEXT_PUBLIC_APP_URL}/regulamento`
  const keyboard = isGroupChat(ctx) ? undefined : new InlineKeyboard().webApp('📋 Ver regulamento', url)
  await ctx.reply('As regras do bolão.', keyboard ? { reply_markup: keyboard } : {})
}

export async function handleAjuda(ctx: Context): Promise<void> {
  if (isGroupChat(ctx) && !isOfficialGroup(ctx)) {
    await ctx.reply(wrongGroupMessage())
    return
  }
  await ctx.reply(helpMessage())
}
