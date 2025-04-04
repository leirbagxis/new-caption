import { Telegraf } from "telegraf"
import { allCommands } from "./handlers/allCommands.js"
import { profileCommand } from "./handlers/profileCommand.js"
import { addChannel, channelCommands, claimOwnerShip, editCaption } from "./handlers/channelCommands.js"

// Bot init
const startBot = async () => {
    const bot = new Telegraf(process.env.BOT_TOKEN)
    
    bot.use(profileCommand())
    bot.use(allCommands())
    bot.use(claimOwnerShip())
    bot.use(channelCommands())
    bot.use(editCaption())
    bot.use(addChannel())

    bot.launch(() => {
        console.log("Bot Online");    
    })
}

export { startBot }