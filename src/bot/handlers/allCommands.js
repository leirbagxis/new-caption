import { saveUser } from "../sevices/userService.js";
import { cleanCommand, commands, createKeyboard, formatText } from "../util.js";

const allCommands = () => {
  return async (ctx, next) => {
    
    try {

      const user = await ctx.getChat()
      const { id, username } = ctx.botInfo
      const getOwner = await ctx.telegram.getChat(process.env.OWNER_ID || process.env.BOT_TOKEN)

      var ownerUser
      if(getOwner.username) {
          ownerUser = `@${getOwner.username}`
      } else {
          ownerUser = getOwner.first_name
      }

      // ## Params Principal
      const params = {
        userId: user.id,
        firstName: user.first_name,
        botId: id,
        botUsername: "@" + username,
        ownerUser
      }

      await saveUser(params)

      // Commands
      if(ctx.message && ctx.message.text){
        const { message_id, text, entities } = ctx.message;
        const parms = cleanCommand(text)
        const command = commands[parms]
        const { message, buttons } = command
        
        if(command) {        
          return await ctx.reply(formatText(message, params), {
            parse_mode: "HTML",
            reply_to_message_id: message_id,
            ...createKeyboard(buttons)
          })
        }

      }

      // Edit Messages Commands
      if(ctx.callbackQuery) {
        const { data } = ctx.callbackQuery
        const command = commands[data];
        const { message, buttons } = command

        if(data !== "profile.info") {
          return await ctx.editMessageText(formatText(message, params), {
            parse_mode: "HTML",
            ...createKeyboard(buttons)
          })
        }
      }
      
    } catch (error) {
      console.log("erro ao atualizar " + error);
      const { message, buttons } = commands["start"]

      return await ctx.editMessageText(formatText("<b>❌ Clique no Botão Abaixo!</b>"), {
          parse_mode:  "HTML",
          ...createKeyboard(buttons)
      })
    }
    

    next();
  }
}



export { allCommands }