import { Telegraf } from "telegraf"
import { allCommands } from "./handlers/allCommands.js"
import { profileCommand } from "./handlers/profileCommand.js"

// Bot init
const startBot = async () => {
    const bot = new Telegraf(process.env.BOT_TOKEN)

    bot.use(profileCommand())
    bot.use(allCommands())

    bot.launch(() => {
        console.log("Bot Online");    
    })
}

export { startBot }