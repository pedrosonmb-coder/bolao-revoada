import { bot } from '@/lib/telegram/bot'
import { env } from '@/lib/env'

async function main() {
  console.log('Configurando identidade do bot...')

  await bot.api.setMyName('Copa26Bot')
  console.log('✓ Nome configurado')

  await bot.api.setMyDescription(
    'Bot do Bolão do Revoada. Copa do Mundo 2026, R$ 900 em jogo. 9 amigos, 104 jogos, zero corpo mole.'
  )
  console.log('✓ Descrição configurada')

  await bot.api.setMyShortDescription('Palpites da Copa 2026.')
  console.log('✓ Short description configurada')

  await bot.api.setMyCommands([
    { command: 'start', description: 'Inicia o bot e abre o Mini App' },
    { command: 'palpitar', description: 'Abre os palpites. Não deixa pra última hora.' },
    { command: 'ranking', description: 'Vê quem tá na frente. Ou tentando não afundar.' },
    { command: 'meuspontos', description: 'Seus pontos até agora. Coragem.' },
    { command: 'proximo', description: 'Próximo jogo. Útil se você esqueceu que tem Copa.' },
    { command: 'jogosdodia', description: 'Jogos de hoje com horários. Sem desculpa.' },
    { command: 'regulamento', description: 'Lê antes de reclamar do resultado.' },
    { command: 'ajuda', description: 'Lista todos os comandos.' },
  ])
  console.log('✓ Comandos configurados')

  await bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'Abrir Bolão',
      web_app: { url: env.NEXT_PUBLIC_APP_URL },
    },
  })
  console.log('✓ Menu button configurado')

  console.log('\nBot configurado com sucesso.')
}

main().catch((err) => {
  console.error('Erro ao configurar bot:', err)
  process.exit(1)
})
