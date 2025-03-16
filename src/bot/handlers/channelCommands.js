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
        const bot = ctx.botInfo
        const username = bot.username
            
        // ### ADD CHANNEL FOR BOT JOIN
        if(ctx.update.my_chat_member && ctx.update.my_chat_member.new_chat_member){
            
            const bot = ctx.botInfo
            const { chat, new_chat_member, old_chat_member, from } = ctx.update.my_chat_member
            
            if(!from.is_bot) {
                await saveUser({
                    userId: from.id,
                    firstName: from.first_name
                })
            }
            
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

            const params = {
                firstName: from.first_name,
                channelName: title,
                channelId: id,
                botUsername: "@" + username
            }

            if(type !== "channel") return;

            const verifyChannel = await getChannelByChannelID(id);
            
            if(verifyChannel) {
                return ctx.telegram.sendMessage(from.id, formatText(exist_error, params), {
                    parse_mode: "HTML",
                    ...createKeyboard(buttons)
                })
            }                
            var session = await createCache(payload)
            //session = JSON.parse(session)

            const question = [
                { text: "✅ | Confirmar", callback_data: `add.yes:${session.key}` }, { text: "❌ | Cancelar", callback_data: `add.not:${session.key}` }
            ]            
            
            return await ctx.telegram.sendMessage(from.id, formatText(message, params), {
                parse_mode: "HTML",
                ...createKeyboard(question)
            })

        }

        // ### ADD CHANNEL FOR MESSAGE FORWARDING
        if(ctx.message && ctx.message.forward_origin) {
            const { message_id, from } = ctx.message

            try {
                
                const { id, title, username, type } = ctx.message.forward_origin.chat
    
                await saveUser({
                    userId: from.id,
                    firstName: from.first_name
                })
    
                if (type !== "channel") {
                    return ctx.reply("eu so posso ser adicionado em canais...", {
                        ...createKeyboard(error_buttons)
                    })
                }
    
                const verifyChannel = await getChannelByChannelID(id);
                
                if(verifyChannel) {
                    return ctx.telegram.sendMessage(from.id, formatText(exist_error), {
                        reply_to_message_id: message_id,
                        parse_mode: "HTML",
                        ...createKeyboard(buttons)
                    })
                }
    
                const verifyAdminsChannel = await ctx.telegram.getChatAdministrators(Number(id))
                const verifyIsPermissions = verifyAdminsChannel.find(user => user.user.id === bot.id)
    
                if(!verifyIsPermissions.can_edit_messages || !verifyIsPermissions.can_invite_users || !verifyIsPermissions.can_post_messages || !verifyIsPermissions.can_delete_messages) {
                    return ctx.reply(formatText(permision_error, {}), {
                        reply_to_message_id: message_id,
                        parse_mode: "HTML",
                        ...createKeyboard(error_buttons)
                    }) 
                }
    
                const params = {
                    firstName: from.first_name,
                    channelName: title,
                    channelId: id
                }
    
                const payload = {
                    channelId: id,
                    title,
                    username: username || "n/a",
                    ownerId: from.id
                }
                const session = await createCache(payload)
    
                const question = [
                    { text: "✅ | Confirmar", callback_data: `add.yes:${session.key}` }, { text: "❌ | Cancelar", callback_data: `add.not:${session.key}` }
                ]
    
                return await ctx.reply(formatText(message, params), {
                    reply_to_message_id: message_id,
                    parse_mode: "HTML",
                    ...createKeyboard(question)
                })
            } catch (error) {
                if(error === "Error: 400: Bad Request: there are no administrators in the private chat") {
                    return ctx.reply(formatText(permision_error, {}), {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons)
                    })       
                }

                console.log("error " + error);
                const params = {
                    firstName: from.first_name,
                }
                
                return ctx.reply(formatText(notfound_error, params), {
                    reply_to_message_id: message_id,
                    parse_mode: "HTML",
                    ...urlCreateKeyboard(error_buttons, 2)
                }) 
            }
            
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

        // } catch (error) {
        //     console.log("nao foi possivel adicionar o canal: " + error);
        //     const { from } = ctx.callbackQuery

        //     const params = {
        //         botUsername: "@" + username,
        //         firstName: from.first_name || "n/a"
        //     }            

        //     return ctx.editMessageText(formatText(notfound_error, params), {
        //         parse_mode: "HTML",
        //         ...createKeyboard(error_buttons)
        //     })
        // }
        
        next()
    }
}

export { channelCommands, addChannel }