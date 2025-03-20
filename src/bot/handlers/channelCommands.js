import { deleteChannelById, getChannelByChannelID, getChannelbyId, saveChannelService, updateChannelService, updateOwnerChannelService } from "../sevices/channelService.js";
import { getUserById, saveUser } from "../sevices/userService.js"
import { applyEntities, commands, createKeyboard, formatButtons, formatText, generateNumericId, logNotMsg, randomId, removeTag, sleep } from "../util.js";
import { createCache, getCacheSession, deleteCache  } from "../sevices/cacheService.js";

const channelCommands = () => {
    return async(ctx, next) => {
        
        try {           
            
            // Edit Messages Commands
            if(ctx.callbackQuery) {
                const user = await ctx.from;                
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

                // # Recarregar dados e salvar mudancas de um canal
                if(data.startsWith('rr_')) {
                    const { message, reconfigure_message, reconfigure_failure, buttons } =  commands["profile.user.channels.mychannel"];
                    const channelId = data.split("_")
                    const getTgInfoChannel = await ctx.telegram.getChat(channelId[1])

                    const reloadConfig = await updateChannelService({
                        channelId: getTgInfoChannel.id,
                        title: getTgInfoChannel.title,
                        inviteUrl: getTgInfoChannel.invite_link
                    })

                    const button = [
                        {
                            text: "⬅️ Voltar",
                            callback_data: "cf_" + channelId[1]
                        },
                        {
                            text: "📝 Meus Canais",
                            callback_data: "profile.user.channels"
                        }
                    ] 

                    if(!reloadConfig) {
                        return ctx.editMessageText(reconfigure_failure, {
                            parse_mode: "HTML",
                            ...createKeyboard(button)
                        })
                    }

                    return ctx.editMessageText(reconfigure_message, {
                        parse_mode: "HTML",
                            ...createKeyboard(button)
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

        next()
    }
}

const addChannel = () => {
    return async(ctx, next) => {
        const { message, exist_error, success, cancel, permision_error, notfound_error, buttons, error_buttons } = commands["toadd"]
                
        
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
            const bot = ctx.botInfo
            const {username} = bot
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
        
        // ### CONFIRM ADD CHANNEL
        if(ctx.callbackQuery) {
            const bot = ctx.botInfo
            const data = ctx.callbackQuery.data.split(":")

            if(data[0] === "add.yes") {
                
                const getSession = await getCacheSession(data[1])
                
                if(!getSession) {
                    return await ctx.editMessageText(formatText(cancel), {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons)
                    })
                }
                
                const user = await ctx.from;
                const channel = await ctx.telegram.getChat(getSession.channelId)

                const payload = {
                    ownerId: user.id,
                    channelId: channel.id,
                    title: channel.title,
                    inviteUrl: channel.invite_link,
                    caption: `   
  
ㅤ  -\` bʏㅤ ${channel.title}ㅤ.ᐟㅤloveㅤısㅤαrtㅤ𔘓 <a href='t.me/${bot.username}'>t.me/legendas</a> ˳ 🍒  
  ㅤ
`
                }

                const save = await saveChannelService(payload)

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

const editCaption = () => {

    return async(ctx, next) => {
        
        if(ctx.channelPost) {

            const { chat, message_id } = ctx.channelPost
            const channelId = chat.id

            const updatePayload = {
                channelId: chat.id,
                title: chat.title
            }
            await updateChannelService(updatePayload)

            const channel = await getChannelByChannelID(BigInt(channelId))
            if(!channel) return;
            

            const buttons = channel.buttons.map(btn => ({
                text: btn.text,
                url: btn.url
            }))


            // ### Edit Message Applied Caption
            if(ctx.channelPost.text && channel.settings.message) {
                try {

                    const {text, entities } = ctx.channelPost
                    const newCaption = applyEntities(`${text}${channel.caption}`, entities)
                    
                    const edit = await ctx.editMessageText(newCaption, {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons, 1)
                    })

                    if(edit) {
                        console.log(`text edited - (${channelId} - ${chat.title})`)
                    }
                } catch (error) {
                    console.log(error);
                    return await logNotMsg(ctx, "Mensagem")
                }
            }

            // ### Edit Audio Applied Caption
            if(ctx.channelPost.audio && channel.settings.audio) {
                try {
                    await sleep(500);

                    const edit = await ctx.telegram.editMessageCaption(channelId, message_id, null, formatText(channel.caption), {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons, 1)
                    })

                    if(edit) {
                        console.log(`audio edited - (${channelId} - ${chat.title})`)
                    }
                } catch (error) {
                    console.log(error);
                    return await logNotMsg(ctx, "Audio")
                }
            }

            // ### Edit Sticker Applied Caption
            if(ctx.channelPost.sticker && channel.settings.sticker) {
                try {
                    const userButton = channel.buttons.map(btn=> [{
                        text: btn.text,
                        url: btn.url
                    }])

                    const edit = await ctx.editMessageReplyMarkup({
                        inline_keyboard: userButton
                    })

                    if(edit) {
                        console.log(`sticker edited - (${channelId} - ${chat.title})`)
                    }
                } catch (error) {
                    console.log(error);
                    return await logNotMsg(ctx, "Sticker")
                }
            }            

            // ### Edit Video Applied Caption
            if(ctx.channelPost.video && channel.settings.video) {
                try {

                    var { caption, caption_entities } = ctx.channelPost
                    if(caption === undefined) {
                        caption = ""
                    }

                    const newCaption = applyEntities(`${caption}${channel.caption}`, caption_entities)
                    
                    const edit = await ctx.editMessageCaption(newCaption, {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons, 1)
                    })

                    if(edit) {
                        console.log(`video edited - (${channelId} - ${chat.title})`)
                    }
                } catch (error) {
                    console.log(error);
                    return await logNotMsg(ctx, "Video")
                }
            }

            // ### Edit Photo Applied Caption
            if(ctx.channelPost.photo && channel.settings.photo) {
                try {

                    var { caption, caption_entities } = ctx.channelPost
                    if(caption === undefined) {
                        caption = ""
                    }

                    const newCaption = applyEntities(`${caption}${channel.caption}`, caption_entities)
                    
                    const edit = await ctx.editMessageCaption(newCaption, {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons, 1)
                    })

                    if(edit) {
                        console.log(`photo edited - (${channelId} - ${chat.title})`)
                    }
                } catch (error) {
                    console.log(error);
                    return await logNotMsg(ctx, "Imagem")
                }
            }

            // ### Edit Gif Applied Caption
            if(ctx.channelPost.animation && channel.settings.gif) {
                try {
                    await sleep(500);
                    const edit = await ctx.editMessageCaption(channel.caption, {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons, 1)
                    })

                    if(edit) {
                        console.log(`animation edited - (${channelId} - ${chat.title})`)
                    }
                } catch (error) {
                    console.log(error);
                    return await logNotMsg(ctx, "Animation")
                }
            }

            
        }


        next()
    }

}

const claimOwnerShip = () => {
    return async (ctx, next) => {        
        const bot = ctx.botInfo

        // ## funcao para mudar de dono via channel button
        if (ctx.msg.reply_to_message) {
            const user = ctx.from
            const { reply_to_message } = ctx.msg
            const newOwnerId = ctx.msg.text
            const { from, text } = reply_to_message
            const { old_success_message, failed_id, success_message, buttons } = commands["profile.user.channels.claim_ownership"]

            if(text.includes("Informe o ID do Usuário")){

                if (!newOwnerId || isNaN(Number(newOwnerId))) {
                    return await ctx.reply(failed_id, {
                        reply_to_message_id: ctx.msgId,
                        parse_mode: "HTML",
                        ...createKeyboard(buttons)
                    })
                }
    
                if(from.id === bot.id && from.username === bot.username && text.includes("ID: -100")) {
                    const fields = text.split("\n")
                    var channelId = fields[5].split(" ")
                    channelId = channelId[2]

                    let getNewOwnerUser
                    try {
                        getNewOwnerUser = await ctx.telegram.getChat(newOwnerId)                        
                    } catch (error) {
                        return await ctx.reply(failed_id, {
                            reply_to_message_id: ctx.msgId,
                            parse_mode: "HTML",
                            ...createKeyboard(buttons)
                        })
                    }

                    let checkAdmin
                    try {
                        checkAdmin = await ctx.telegram.getChatAdministrators(channelId);
                    } catch (error) {
                        return await ctx.reply("⚠️ Erro ao acessar canal\n\n🚫 O bot pode não estar no canal ou o ID está errado.", {
                            reply_to_message_id: ctx.msgId,
                            parse_mode: "HTML",
                            ...createKeyboard(buttons)
                        })
                    }

                    let verifyChannel
                    try {
                        verifyChannel = await getChannelbyId(user.id, channelId)
                        console.log(verifyChannel);
                        
                        if (!verifyChannel){
                            return await ctx.reply("🚫 Sem Permissão\n\n⚠️ Você não pode mais configurar esse canal.", {
                                reply_to_message_id: ctx.msgId,
                                parse_mode: "HTML",
                                ...createKeyboard(buttons)
                            })
                        }
                    } catch (error) {
                        return await ctx.reply("🚫 Sem Permissão\n\n⚠️ Você não pode mais configurar esse canal.", {
                            reply_to_message_id: ctx.msgId,
                            parse_mode: "HTML",
                            ...createKeyboard(buttons)
                        })
                    }

                    const find = checkAdmin.find(user => user.user.id === getNewOwnerUser.id)
                    
                    if(!find) {
                        return await ctx.reply("🚫 Sem Permissão\n\n⚠️ O usuário não é administrador/dono deste canal.", {
                            reply_to_message_id: ctx.msgId,
                            parse_mode: "HTML",
                            ...createKeyboard(buttons)
                        })
                    }
                    
                    const updateOwner = await updateOwnerChannelService(channelId, getNewOwnerUser.id)

                    if(updateOwner){

                        const params = {
                            channelName: updateOwner.title,
                            channelId: updateOwner.channelId,
                            newOwnerName: getNewOwnerUser.first_name,
                            newOwnerId: getNewOwnerUser.id
                        }
                        await ctx.reply(formatText(old_success_message, params), {
                            parse_mode: "HTML",
                            ...createKeyboard(buttons)
                        })

                        return await ctx.telegram.sendMessage(getNewOwnerUser.id, formatText(success_message, params), {
                            parse_mode: "HTML",
                            ...createKeyboard(buttons)
                        })
                    }
                    
                }          
            }
            
        }
        

        // ### Funcao para confirmar/cancelar acao de assumir controle
        if(ctx.callbackQuery) {

            const { data } = ctx.callbackQuery

            // ## funcao para mostrar descricao do comando transferir acesso
            if(data.startsWith("paccess")) {
                const { info_command, transfer_buttons } = commands["profile.user.channels.claim_ownership"]
                const fields = data.split(":")

                const params = {
                    channelId: fields[1]
                }

                const buttons = formatButtons(transfer_buttons, params)
                console.log(data);
                
                return await ctx.editMessageText(info_command, {
                    parse_mode: "HTML",
                    ...createKeyboard(buttons, 1)
                })
                
            }

            // ## funcao para iniciar processo de mudar owner channel
            if(data.startsWith("transfer")) {
                const { query_message, transfer_buttons } = commands["profile.user.channels.claim_ownership"]
                const fields = data.split(":")

                const getChannel = await getChannelByChannelID(fields[1])
                const getUser = await ctx.telegram.getChat(Number(getChannel.ownerId))
                const params = {
                    channelId: getChannel.channelId,
                    channelName: getChannel.title,
                    ownerId: getChannel.ownerId,
                    ownerName: getUser.first_name
                }
                

                return await ctx.reply(formatText(query_message, params), {
                    reply_to_message_id: ctx.msgId,
                    parse_mode: "HTML",
                    reply_markup: {
                        force_reply: true
                    }
                })
            }

            // ### Aceitar confirmacao de mudanca de owner
            if(data.startsWith("accept_claim")) {
                const { success_message, buttons } = commands["profile.user.channels.claim_ownership"]
                const fields = data.split(":")
                
                const updateOwner = await updateOwnerChannelService(fields[1], fields[2])

                if(updateOwner){
                    const params = {
                        channelName: updateOwner.title,
                        channelId: updateOwner.channelId
                    }

                    return await ctx.editMessageText(formatText(success_message, params), {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons)
                    })
                }
            }

            if(data.startsWith("cancel_claim")) {
                const { cancel_message, buttons } = commands["profile.user.channels.claim_ownership"]
                const fields = data.split(":")
                
                const getChannel = await getChannelByChannelID(fields[1])

                if(getChannel){
                    const params = {
                        channelName: getChannel.title,
                        channelId: getChannel.channelId
                    }

                    return await ctx.editMessageText(formatText(cancel_message, params), {
                        parse_mode: "HTML",
                        ...createKeyboard(buttons)
                    })
                }
            }

            return next()
        }


        // ### Funcao Assumir controle
        
        if (!ctx.inlineQuery) return next();

        const { from, query } = ctx.inlineQuery;
        const cmd = query.split(" ");

        try {
            if (cmd[0] === "Claim") {
                const chatId = cmd[1];
                const { message, buttons } = commands["profile.user.channels.claim_ownership"]

                if (!chatId || isNaN(Number(chatId))) {
                    return await ctx.answerInlineQuery([
                        {
                            type: "article",
                            id: generateNumericId(from.id),
                            title: "🔎 ID Inválido",
                            input_message_content: {
                                message_text: "⚠️ O ID deve ser um número válido.",
                            },
                        },
                    ], { cache_time: 0 });
                }

                let channelInDb
                try {

                    channelInDb = await getChannelByChannelID(chatId)

                    if(channelInDb) {
                        if(Number(channelInDb.ownerId) === from.id) {
                            return await ctx.answerInlineQuery([
                                {
                                    type: "article",
                                    id: generateNumericId(from.id),
                                    title: "⚠️ Canal já reivindicado",
                                    input_message_content: {
                                        message_text: `Este canal já está vinculado à você.`,
                                        parse_mode: "HTML"
                                    },
                                    ...createKeyboard(buttons)
                                },
                            ], { cache_time: 0 });
                        }
                    }
                    
                    
                } catch (error) {
                    console.error("❌ ERRO DB:", error);
                    return await ctx.answerInlineQuery([
                        {
                            type: "article",
                            id: generateNumericId(from.id),
                            title: "❌ Erro ao verificar banco de dados",
                            input_message_content: {
                                message_text: "Ocorreu um erro ao verificar o banco de dados.",
                                parse_mode: "HTML"
                            },
                        },
                    ], { cache_time: 0 });
                }

                let checkAdmin;
                try {
                    checkAdmin = await ctx.telegram.getChatAdministrators(chatId);
                } catch (err) {
                    return await ctx.answerInlineQuery([
                        {
                            type: "article",
                            id: generateNumericId(from.id),
                            title: "⚠️ Erro ao acessar canal",
                            input_message_content: {
                                message_text: "🚫 O bot pode não estar no canal ou o ID está errado.",
                            },
                        },
                    ], { cache_time: 0 });
                }

                const ownerChannel = checkAdmin.find(user => user.status === "creator" && user.user.id === from.id);

                if (!ownerChannel) {
                    return await ctx.answerInlineQuery([
                        {
                            type: "article",
                            id: generateNumericId(from.id),
                            title: "🚫 Sem Permissão",
                            input_message_content: {
                                message_text: `⚠️ Você não é o criador/dono deste canal (${chatId}).`,
                            },
                        },
                    ], { cache_time: 0 });
                }
                
                const userGetInfo = await getUserById(channelInDb.ownerId)
                
                
                const params = {
                    channelName: channelInDb.title,
                    creatorName: userGetInfo.firstName || "n/a",
                    channelId: channelInDb.channelId,
                    creatorId: channelInDb.ownerId
                }

                return await ctx.answerInlineQuery([
                    {
                        type: "article",
                        id: generateNumericId(from.id),
                        title: "✅ Canal Encontrado",
                        description: `Canal ${chatId} - Confirme a propriedade`,
                        input_message_content: {
                            message_text: formatText(message, params),
                            parse_mode: "HTML"
                        },
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "✅ Aceitar", callback_data: `accept_claim:${chatId}:${from.id}` },
                                    { text: "❌ Cancelar", callback_data: `cancel_claim:${chatId}:${from.id}` }
                                ]
                            ]
                        },
                    },
                ], {
                    cache_time: 0,
                    switch_pm_parameter: `claim_success_${chatId}_${from.id}`
                });
            }
            
            return next();
        } catch (error) {
            console.error("❌ ERRO:", error);
            return await ctx.answerInlineQuery([
                {
                    type: "article",
                    id: generateNumericId(from.id),
                    title: "❌ Erro no processamento",
                    input_message_content: {
                        message_text: "Ocorreu um erro ao processar sua solicitação.",
                    },
                },
            ], { cache_time: 0 });
        }
    };
};


export { channelCommands, addChannel, editCaption, claimOwnerShip }