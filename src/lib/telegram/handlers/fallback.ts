import type { Context } from 'grammy'
import { fallbackDmMessage } from '../messages'

export async function handleFallback(ctx: Context): Promise<void> {
  const chatType = ctx.chat?.type
  // Em grupo: ignora silenciosamente — não polui o chat
  if (chatType === 'group' || chatType === 'supergroup') return

  await ctx.reply(fallbackDmMessage())
}
