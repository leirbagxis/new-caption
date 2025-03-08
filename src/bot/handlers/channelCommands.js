import { deleteChannelById } from "../sevices/channelService.js";
import { getUserById, saveUser } from "../sevices/userService.js"
import { commands, createKeyboard, formatDate, formatText } from "../util.js";

const channelCommands = () => {
    return async(ctx, next) => {
        
        try {
            
            const user = await ctx.getChat()
            const params = {
                userId: user.id,
                firstName: user.first_name
            }
        
            const save = await saveUser(params)

            // Edit Messages Commands
            if(ctx.callbackQuery) {
                const { data } = ctx.callbackQuery
                
                const userInfo = await getUserById(user.id)       
                
                // # Confirmacao para excluir o canal do bot
                if(data.startsWith('del_')) {
                    
                    const { confirm_delete, buttons } = commands["profile.user.channels.mychannel"];
                    const channelId = data.split("_")
                    const channelInfo = userInfo.channel.find(channel => channel.channelId === BigInt(channelId[1]))
                                        
                    params["channelName"] = channelInfo.title
                    params["channelId"] = channelId[1]

                    const deleteChannelButton = [
                        {
                            text: "Excluir",
                            callback_data: "ex_" + channelId[1]
                        },
                        {
                            text: "Cancelar",
                            callback_data: "can_" + channelId[1]
                        }
                    ]                    

                    return ctx.editMessageText(formatText(confirm_delete, params), {
                        parse_mode: "HTML",
                        ...createKeyboard(deleteChannelButton)
                    })
                }
                
                // # Cancelar acao de excluir o canal do bot
                if(data.startsWith('can_')) {
                    await ctx.answerCbQuery("Operacao cancelada!..")
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

                // # Excluir o canal em definitivo
                if(data.startsWith('ex_')) {
                    
                    const { success_delete, buttons } =  commands["profile.user.channels.mychannel"];
                    const channelId = data.split("_")
                    const channelInfo = userInfo.channel.find(channel => channel.channelId === BigInt(channelId[1]))
                                        
                    params["channelName"] = channelInfo.title
                    params["channelId"] = channelId[1]

                    const deleteChannel = await deleteChannelById(channelInfo.ownerId, channelInfo.channelId)

                    if (deleteChannel) {
                        const finalButtons = [
                            {
                                text: "⬅️ Voltar",
                                callback_data: "profile.user.channels"
                            },
                            {
                                text: "🏠 Início",
                                callback_data: "start"
                            }
                        ]                    
    
                        return ctx.editMessageText(formatText(success_delete, params), {
                            parse_mode: "HTML",
                            ...createKeyboard(finalButtons)
                        })                        
                    }                   

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

        next()
    }
}

export { channelCommands }