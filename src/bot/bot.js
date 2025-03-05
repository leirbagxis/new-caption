import { Telegraf } from "telegraf"

// Bot init
const startBot = async () => {
    const bot = new Telegraf(process.env.BOT_TOKEN)

    bot.command("start", ctx => {
        return ctx.reply("Bem vindo ao Bot " + ctx.from.first_name)
    })


    bot.launch(() => {
        console.log("Bot Online");    
    })
}

export { startBot }