import { saveUser } from "../sevices/userService.js"
import { cleanCommand, commands, createKeyboard, formatText } from "../util.js";

const profileCommand = () => {
    return async(ctx, next) => {
        const user = await ctx.getChat()
        const params = {
            userId: user.id,
            firstName: user.first_name
        }
      
        const save = await saveUser(params)

        // Edit Messages Commands
        if(ctx.callbackQuery) {
            const { data } = ctx.callbackQuery
            const command = commands[data];
            const { message, buttons } = command

            if(data === "profile.info") {
                return ctx.editMessageText(formatText(message, params), {
                parse_mode: "HTML",
                ...createKeyboard(buttons)
                })
            }
        }

        next()
    }
}

export { profileCommand }