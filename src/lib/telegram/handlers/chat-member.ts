import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import { db } from '@/lib/db'
import { botMessages } from '@/lib/db/schema'
import { env } from '@/lib/env'
import { welcomeGroupMessage } from '../messages'

export async function handleChatMember(ctx: Context): Promise<void> {
  const update = ctx.chatMember
  if (!update) return

  // Só processa o grupo oficial
  if (String(update.chat.id) !== env.TELEGRAM_GROUP_CHAT_ID) return

  // Só quando alguém entra (old=left/kicked, new=member)
  const wasOut = ['left', 'kicked'].includes(update.old_chat_member.status)
  const isNowMember = update.new_chat_member.status === 'member'
  if (!wasOut || !isNowMember) return

  const newMember = update.new_chat_member.user
  if (newMember.is_bot) return

  const botUsername = env.TELEGRAM_BOT_USERNAME
  const startUrl = `https://t.me/${botUsername}?start=welcome`

  const keyboard = new InlineKeyboard().url('Iniciar Bolão', startUrl)

  await ctx.api.sendMessage(
    update.chat.id,
    welcomeGroupMessage(newMember.first_name, botUsername),
    { reply_markup: keyboard }
  )

  await db.insert(botMessages).values({
    type: 'welcome_group',
    sent_to: String(update.chat.id),
    match_id: null,
    payload: JSON.stringify({ telegram_id: newMember.id, sent_at: new Date().toISOString() }),
  })
}
