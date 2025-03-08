import { saveUser } from "../sevices/userService.js";
import { cleanCommand, commands, createKeyboard, formatText } from "../util.js";

const allCommands = () => {
  return async (ctx, next) => {
    
    try {

      const user = await ctx.getChat()

      const params = {
        userId: user.id,
        firstName: user.first_name
      }

      await saveUser(params)

      // Commands
      if(ctx.message && ctx.message.text){
        const { message_id, text, entities } = ctx.message;
        const parms = cleanCommand(text)
        const command = commands[parms]
        const { message, buttons } = command
        
        if(command) {        
          return ctx.reply(formatText(message, params), {
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
          return ctx.editMessageText(formatText(message, params), {
            parse_mode: "HTML",
            ...createKeyboard(buttons)
          })
        }
      }
      
    } catch (error) {
      console.log("erro ao atualizar " + error);
      const { message, buttons } = commands["start"]

      return ctx.editMessageText(formatText("<b>❌ Clique no Botão Abaixo!</b>"), {
          parse_mode:  "HTML",
          ...createKeyboard(buttons)
      })
    }
    

    next();
  }
}



export { allCommands }