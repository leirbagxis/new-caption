import { getUserById, saveUser } from "../sevices/userService.js"
import { cleanCommand, commands, createKeyboard, formatButtons, formatDate, formatText, removeTag } from "../util.js";

const profileCommand = () => {
    return async(ctx, next) => {
        
        try {        
            
            // Edit Messages Commands profile
            if(ctx.callbackQuery) {
                const user = await ctx.from;
                const params = {
                    userId: user.id,
                    firstName: removeTag(user.first_name)
                }
            
                const save = await saveUser(params)
                const { data } = ctx.callbackQuery
                
                const userInfo = await getUserById(user.id)
                params["countChannel"] = userInfo.channel.length.toString() || "0"
                params["register"] = formatDate(userInfo.createAt)                

                if(data === "profile.info") {
                    const { message, buttons } = commands[data];

                    return ctx.editMessageText(formatText(message, params), {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons)
                    })
                }

                if(data === "profile.user.channels") {
                    const { message, buttons } = commands[data];

                    if(userInfo.channel.length < 1) {
                        return ctx.answerCbQuery("Obs... parece que você não possui nenhum canal cadastrado", {
                            show_alert: true
                        })
                    }
                    
                    const userChannelButton = userInfo.channel.map(btn => {
                        return { text: btn.title, callback_data: `cf_${btn.channelId}` }
                    })
                    
                    return ctx.editMessageText(formatText(message, params), {
                        parse_mode: "HTML",
                        ...createKeyboard([...userChannelButton, ...buttons], 1)
                    })
                }

                if(data.startsWith('cf_')) {
                    const { message, buttons, channel_buttons } = commands["profile.user.channels.mychannel"];
                    const channelId = data.split("_")
                    const channelInfo = userInfo.channel.find(channel => channel.channelId === BigInt(channelId[1]))
                                        
                    params["channelName"] = channelInfo.title
                    params["channelId"] = channelId[1]

                    const paramsB = {
                        webAppUrl: process.env.WEBAPP_URL,
                        userId: user.id,
                        channelId: channelId[1]
                    }                    

                    const repackButtons = formatButtons(channel_buttons, paramsB)

                    return ctx.editMessageText(formatText(message, params), {
                        parse_mode: "HTML",
                        ...createKeyboard([...repackButtons, ...buttons], 1)
                    })
                }
            }

        } catch (error) {
            console.log("erro ao atualizar " + error);
            const { message, buttons } = commands["start"]

            // return ctx.editMessageText(formatText("<b>❌ Clique no Botão Abaixo!</b>"), {
            //     parse_mode:  "HTML",
            //     ...createKeyboard(buttons)
            // })
        }

        next()
    }
}

export { profileCommand }