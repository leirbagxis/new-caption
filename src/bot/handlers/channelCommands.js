import { deleteChannelById, getChannelByChannelID, saveChannelService } from "../sevices/channelService.js";
import { getUserById, saveUser } from "../sevices/userService.js"
import { commands, createKeyboard, formatText } from "../util.js";
import { createCache, getCacheSession, deleteCache  } from "../sevices/cacheService.js";

const channelCommands = () => {
    return async(ctx, next) => {
        
        try {           
            
            // Edit Messages Commands
            if(ctx.callbackQuery) {
                const user = await ctx.getChat()
                const params = {
                    userId: user.id,
                    firstName: user.first_name
                }
                const save = await saveUser(params)
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

const addChannel = () => {
    return async(ctx, next) => {
        const { message, exist_error, success, cancel, permision_error, notfound_error, buttons, error_buttons } = commands["toadd"]

        try {
            
            // ### ADD CHANNEL FOR BOT JOIN
            if(ctx.update.my_chat_member && ctx.update.my_chat_member.new_chat_member){
                
                const bot = ctx.botInfo
                const { chat, new_chat_member, old_chat_member, from } = ctx.update.my_chat_member
                                
                await saveUser({
                    userId: from.id,
                    firstName: from.first_name
                })

                if (new_chat_member.user.id !== bot.id) return;
                if (new_chat_member.status !== "administrator") return;
                if (old_chat_member.status !== "left") return;
                if (new_chat_member.status === "left") return;
                if (!new_chat_member.can_edit_messages || !new_chat_member.can_invite_users || !new_chat_member.can_post_messages || !new_chat_member.can_delete_messages) return;
                
                const { id, title, username, type } = chat
                
                const payload = {
                    channelId: id,
                    title,
                    username: username || "n/a",
                    type,
                    ownerId: from.id
                }

                if(type !== "channel") return;

                const verifyChannel = await getChannelByChannelID(id);
                
                if(verifyChannel) {
                    return ctx.telegram.sendMessage(from.id, formatText(exist_error, {}), {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons)
                    })
                }                
                var session = await createCache(payload)
                session = JSON.parse(session)

                const question = [
                    { text: "✅ | Confirmar", callback_data: `add.yes:${session.key}` }, { text: "❌ | Cancelar", callback_data: `add.not:${session.key}` }
                ]            
                
                const params = {
                    firstName: from.first_name,
                    channelName: title,
                    channelId: id,
                }
                
                return await ctx.telegram.sendMessage(from.id, formatText(message, params), {
                    parse_mode: "HTML",
                    ...createKeyboard(question)
                })

            }
            
            if(ctx.callbackQuery) {
                const data = ctx.callbackQuery.data.split(":")

                if(data[0] === "add.yes") {
                    
                    const getSession = await getCacheSession(data[1])
                    
                    if(!getSession) {
                        return await ctx.editMessageText(formatText(cancel), {
                            parse_mode: "HTML",
                            ...createKeyboard(buttons)
                        })
                    }
                    
                    const user = await ctx.getChat()
                    const channel = await ctx.telegram.getChat(getSession.channelId)

                    const payload = {
                        ownerId: user.id,
                        channelId: channel.id,
                        title: channel.title,
                        inviteUrl: channel.invite_link
                    }

                    const save = saveChannelService(payload) 

                    if(save) {
                        await deleteCache(data[1])

                        const channelBtn = [
                            { text: "Configure Agora", webApp: `${process.env.WEBAPP_URL}/${save.ownerId}/${save.channelId}` }
                        ]

                        const params = {
                            firstName: user.first_name
                        }

                        const sucs = await ctx.editMessageText(formatText(success, params), {
                            parse_mode: "HTML",
                            ...createKeyboard([...channelBtn, ...buttons], 1)
                        })

                        return await ctx.telegram.setMessageReaction(
                            sucs.chat.id,
                            sucs.message_id,
                            [{ type: 'emoji', emoji: '🎉' }], 
                            { is_big: true }
                        );
                    }
                    return
                }

                if(data[0] === "add.not") {
                    await deleteCache(data[1])

                    return ctx.editMessageText(formatText(cancel), {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons)
                    })
                }
            }

        } catch (error) {
            console.log("nao foi possivel adicionar o canal: " + error);

            return ctx.editMessageText(formatText(notfound_error, {}), {
                parse_mode: "HTML",
                ...createKeyboard(buttons)
            })
        }
        
        next()
    }
}

export { channelCommands, addChannel }

// {
//     id: -1002279408412,
//     title: 'Teste',
//     type: 'channel',
//     invite_link: 'https://t.me/+rL8ih118drlmYzJh',
//     can_send_gift: true,
//     has_visible_history: true,
//     can_send_paid_media: true,
//     available_reactions: [],
//     max_reaction_count: 11,
//     accent_color_id: 1
//   }