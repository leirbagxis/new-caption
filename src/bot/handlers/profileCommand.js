import { getUserById, saveUser } from "../sevices/userService.js"
import { cleanCommand, commands, createKeyboard, formatDate, formatText } from "../util.js";

const profileCommand = () => {
    return async(ctx, next) => {
        
        try {        
            
            // Edit Messages Commands profile
            if(ctx.callbackQuery) {
                const user = await ctx.getChat()
                const params = {
                    userId: user.id,
                    firstName: user.first_name
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
                    const { message, buttons } = commands["profile.user.channels.mychannel"];
                    const channelId = data.split("_")
                    const channelInfo = userInfo.channel.find(channel => channel.channelId === BigInt(channelId[1]))
                                        
                    params["channelName"] = channelInfo.title
                    params["channelId"] = channelId[1]
                    
                    const configureChannelWeb = [{
                        text: "Configure Agora",
                        webApp: `${process.env.WEBAPP_URL}/${user.id}/${channelId[1]}`
                    }]

                    const deleteChannelButton = [{
                        text: "Deletar Canal",
                        callback_data: "del_" + channelId[1]
                    }]

                    return ctx.editMessageText(formatText(message, params), {
                        parse_mode: "HTML",
                        ...createKeyboard([...configureChannelWeb, ...deleteChannelButton, ...buttons], 1)
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