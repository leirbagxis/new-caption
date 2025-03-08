import { cleanCommand, commands, createKeyboard, formatText } from "../util.js";

const allCommands = () => {
  return async (ctx, next) => {
    const user = await ctx.getChat()
    const params = {
      firstName: user.first_name,
      userId: user.id
    }

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
    

    next();
  }
}



export { allCommands }