import { createChannelButtonService, deleteChannelById, getChannelByChannelID, getChannelbyId, saveChannelService, updateChannelService, updateOwnerChannelService } from "../sevices/channelService.js";
import { getUserById, saveUser } from "../sevices/userService.js"
import { applyEntities, commands, createKeyboard, detectParseMode, formatButtons, formatText, generateNumericId, logNotMsg, randomId, removeTag, sleep } from "../util.js";
import { createCache, getCacheSession, deleteCache  } from "../sevices/cacheService.js";
import { generationSignedUrl } from "../../security/authSignature.js";
import { getMessageType, processMessage } from "./auxiliaryFunctions.js";


const channelCommands = () => {
    const commandsCache = {
        'profile.user.channels.mychannel': commands["profile.user.channels.mychannel"],
        'start': commands["start"]
    };

    const callbackHandlers = {
        'del_': handleDeleteConfirmation,
        'can_': handleCancelDelete,
        'ex_': handleExecuteDelete,
        'rr_': handleReloadChannelConfig,
        'gc:': handleGroupChannelsConfirmation,
        'gcYes:': handleGroupChannels,
        'cf_': handleChannelConfig
    };

    // Função para criar botões de forma padronizada
    const createNavigationButtons = (type, channelId) => {
        const buttonSets = {
            'delete': [
                { text: "Excluir", callback_data: `ex_${channelId}` },
                { text: "Cancelar", callback_data: `can_${channelId}` }
            ],
            'back': [
                { text: "⬅️ Voltar", callback_data: `cf_${channelId}` }
            ],
            'home': [
                { text: "⬅️ Voltar", callback_data: "profile.user.channels" },
                { text: "🏠 Início", callback_data: "start" }
            ],
            'groupConfirm': [
                { text: "Confirmar", callback_data: `gcYes:${channelId}` },
                { text: "Cancelar", callback_data: `can_${channelId}` }
            ]
        };
        
        return buttonSets[type] || [];
    };

    // Função auxiliar para editar mensagens
    const editResponseMessage = async (ctx, message, buttons, columns = 2) => {
        return ctx.editMessageText(message, {
            parse_mode: "HTML",
            ...createKeyboard(buttons, columns)
        });
    };

    // Função para obter informações do canal pela dn
    const getChannelInfo = (userInfo, channelId) => {
        const numericChannelId = BigInt(channelId);
        return userInfo.channel.find(channel => channel.channelId === numericChannelId);
    };

    // Handler para confirmação de exclusão
    async function handleDeleteConfirmation(ctx, user, userInfo, data) {
        const { confirm_delete } = commandsCache['profile.user.channels.mychannel'];
        const channelId = data.split("_")[1];
        const channelInfo = getChannelInfo(userInfo, channelId);
        
        if (!channelInfo) return handleError(ctx);
        
        const params = {
            userId: user.id,
            firstName: removeTag(user.first_name),
            channelName: removeTag(channelInfo.title),
            channelId: channelId
        };

        const deleteButtons = createNavigationButtons('delete', channelId);
        return editResponseMessage(ctx, formatText(confirm_delete, params), deleteButtons);
    }

    // Handler para cancelar exclusão
    async function handleCancelDelete(ctx, user, userInfo, data) {
        await ctx.answerCbQuery("Operação cancelada!..");
        
        const { message, buttons, channel_buttons } = commandsCache['profile.user.channels.mychannel'];
        const channelId = data.split("_")[1];
        const channelInfo = getChannelInfo(userInfo, channelId);
        
        if (!channelInfo) return handleError(ctx);
        
        const params = {
            userId: user.id,
            firstName: removeTag(user.first_name),
            channelName: removeTag(channelInfo.title),
            channelId: channelId
        };

        const paramsB = {
            webAppUrl: process.env.WEBAPP_URL,
            userId: user.id,
            channelId: channelId,
            signatureHash: generationSignedUrl(user.id, channelId)
        };

        const repackButtons = formatButtons(channel_buttons, paramsB);
        return editResponseMessage(ctx, formatText(message, params), [...repackButtons, ...buttons], 1);
    }

    // Handler para executar exclusão
    async function handleExecuteDelete(ctx, user, userInfo, data) {
        const { success_delete } = commandsCache['profile.user.channels.mychannel'];
        const channelId = data.split("_")[1];
        const channelInfo = getChannelInfo(userInfo, channelId);
        
        if (!channelInfo) return handleError(ctx);
        
        const params = {
            userId: user.id,
            firstName: removeTag(user.first_name),
            channelName: removeTag(channelInfo.title),
            channelId: channelId
        };

        try {
            const deleteChannel = await deleteChannelById(channelInfo.ownerId, channelInfo.channelId);
            if (!deleteChannel) return handleError(ctx);
            
            const homeButtons = createNavigationButtons('home');
            return editResponseMessage(ctx, formatText(success_delete, params), homeButtons);
        } catch (error) {
            console.error("Erro ao excluir canal:", error);
            return handleError(ctx);
        }
    }

    // Handler para recarregar configuração do canal
    async function handleReloadChannelConfig(ctx, user, userInfo, data) {
        const { reconfigure_message, reconfigure_failure } = commandsCache['profile.user.channels.mychannel'];
        const channelId = data.split("_")[1];
        
        try {
            const getTgInfoChannel = await ctx.telegram.getChat(channelId);
            
            const updateData = {
                channelId: getTgInfoChannel.id,
                title: removeTag(getTgInfoChannel.title),
                inviteUrl: getTgInfoChannel.invite_link
            };
            
            const reloadConfig = await updateChannelService(updateData);
            const backButtons = createNavigationButtons('back', channelId);
            
            const message = reloadConfig ? reconfigure_message : reconfigure_failure;
            return editResponseMessage(ctx, message, backButtons);
        } catch (error) {
            console.error("Erro ao recarregar configuração:", error);
            return handleError(ctx);
        }
    }

    // Handler para confirmação de agrupamento de canais
    async function handleGroupChannelsConfirmation(ctx, user, userInfo, data) {
        const { gc_description } = commandsCache['profile.user.channels.mychannel'];
        const channelId = data.split(":")[1];
        const channelInfo = getChannelInfo(userInfo, channelId);
        
        if (!channelInfo) return handleError(ctx);
        
        const params = {
            userId: user.id,
            firstName: removeTag(user.first_name),
            channelName: removeTag(channelInfo.title),
            channelId: channelId
        };

        const groupConfirmButtons = createNavigationButtons('groupConfirm', channelId);
        return editResponseMessage(ctx, formatText(gc_description, params), groupConfirmButtons);
    }

    // Handler para configuração de canal
    async function handleChannelConfig(ctx, user, userInfo, data) {
        // Implementação necessária para handleChannelConfig
        // Esta função deveria ser chamada quando um usuário clica no botão "⬅️ Voltar"
        return ctx.answerCbQuery("Retornando à configuração do canal...");
    }

    // Handler para agrupamento de canais
    async function handleGroupChannels(ctx, user, userInfo, data) {
        const channelId = data.split(":")[1];
        const userChannelCount = userInfo.channel.length;
        
        // Verificação de número mínimo de canais
        if (userChannelCount <= 1) {
            return ctx.answerCbQuery("Obs... parece que você só possui 1 canal cadastrado", {
                show_alert: true
            });
        }

        const differentChannels = userInfo.channel.filter(cn => cn.channelId !== BigInt(channelId));
        const thisChannel = userInfo.channel.find(cn => cn.channelId === BigInt(channelId));
        
        if (!thisChannel) return handleError(ctx);
        
        const params = {
            userId: user.id,
            firstName: removeTag(user.first_name),
            channelName: removeTag(thisChannel.title),
            channelId: channelId
        };

        try {
            // Processando canais em lote em vez de um por um
            const groupPromises = differentChannels.map(async (channel) => {
                const getChannel = await ctx.telegram.getChat(Number(channel.channelId));
                
                const buttonUrl = getChannel.active_usernames?.[0]
                    ? `t.me/${getChannel.active_usernames[0]}`
                    : getChannel.invite_link;
                    
                // Verificação por índice para evitar iterações desnecessárias
                const existButton = thisChannel.buttons.some(btn => 
                    btn.text === channel.title && 
                    btn.url === buttonUrl
                );
                
                if (!existButton) {
                    return await createChannelButtonService(userInfo.userId, channelId, {
                        buttonName: channel.title,
                        buttonUrl
                    });
                } else {
                    return { 
                        skipped: true, 
                        channelId: channel.channelId.toString(),
                        reason: "Botão já existe"
                    };
                }
            });

            const results = await Promise.all(groupPromises);
            const { gc_confirm } = commandsCache['profile.user.channels.mychannel'];
            
            const added = results.filter(r => !r.skipped).length;
            const skipped = results.filter(r => r.skipped).length;
            
            let message = formatText(gc_confirm, params);
            if (skipped > 0) {
                message += `\n\n<i>${skipped} canal(is) já estava(m) vinculado(s) e foi(ram) ignorado(s).</i>`;
            }

            const backButtons = createNavigationButtons('back', channelId);
            return editResponseMessage(ctx, message, backButtons);
        } catch (error) {
            console.error("Erro ao agrupar canais:", error);
            
            const { gc_failure } = commandsCache['profile.user.channels.mychannel'];
            const backButtons = createNavigationButtons('back', channelId);
            
            return editResponseMessage(ctx, formatText(gc_failure, params), backButtons);
        }
    }

    // Handler para erros
    function handleError(ctx) {
        const { buttons } = commandsCache['start'];
        return editResponseMessage(ctx, formatText("<b>❌ Clique no Botão Abaixo!</b>"), buttons);
    }

    // Função principal que é executada pelo middleware
    return async (ctx, next) => {
        if (!ctx.callbackQuery) return next();
        
        try {
            const user = ctx.from;
            const { data } = ctx.callbackQuery;
            
            // Verificações de segurança para evitar processamento desnecessário
            if (!user || !data) return next();
            
            // Usar operações paralelas para melhorar performance
            const [saveUserResult, userInfo] = await Promise.all([
                saveUser({
                    userId: user.id,
                    firstName: removeTag(user.first_name)
                }),
                getUserById(user.id)
            ]);
            
            if (!userInfo) return handleError(ctx);
            
            // Identificação do prefixo do comando para roteamento dinâmico
            const prefix = Object.keys(callbackHandlers).find(prefix => data.startsWith(prefix));
            if (prefix) {
                return await callbackHandlers[prefix](ctx, user, userInfo, data);
            }
            
            // Se não encontrou um handler específico, passa para o próximo middleware
            return next();
        } catch (error) {
            console.error("Erro ao processar comando:", error);
            return handleError(ctx);
        }
    };
};

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
                    firstName: removeTag(from.first_name)
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
                title: removeTag(title),
                username: username || "n/a",
                type,
                ownerId: from.id
            }

            const params = {
                firstName: removeTag(from.first_name),
                channelName: removeTag(title),
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
                    firstName: removeTag(from.first_name)
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
                        ...createKeyboard(error_buttons)
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
                    firstName: removeTag(from.first_name),
                    channelName: removeTag(title),
                    channelId: id
                }
    
                const payload = {
                    channelId: id,
                    title: removeTag(title),
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
                    firstName: removeTag(from.first_name),
                }

                return ctx.reply(formatText(notfound_error, params), {
                    reply_to_message_id: message_id,
                    parse_mode: "HTML",
                    ...createKeyboard(error_buttons, 2)
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
                    title: removeTag(channel.title),
                    inviteUrl: channel.invite_link
                }

                const save = await saveChannelService(payload)

                if(save) {
                    await deleteCache(data[1])

                    const paramsB = {
                        webAppUrl: process.env.WEBAPP_URL,
                        userId: save.ownerId,
                        channelId: save.channelId,
                        signatureHash: generationSignedUrl(save.ownerId, save.channelId),
                        firstName: removeTag(user.first_name)
                    }                                       

                    const repackButtons = formatButtons(buttons, paramsB)

                    const sucs = await ctx.editMessageText(formatText(success, paramsB), {
                        parse_mode: "HTML",
                        ...createKeyboard(repackButtons, 1)
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
                    ...createKeyboard(error_buttons)
                })
            }
        }
                
        next()
    }
}

const claimOwnerShip = () => {
    return async (ctx, next) => {        
        const bot = ctx.botInfo

        // ## funcao para mudar de dono via channel button
        if (ctx.msg && ctx.msg.reply_to_message && ctx.msg.reply_to_message.text) {
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

                    saveUser({
                        userId: BigInt(getNewOwnerUser.id),
                        firstName: removeTag(getNewOwnerUser.first_name)
                    })

                    let verifyChannel
                    try {
                        verifyChannel = await getChannelbyId(user.id, channelId)
                        
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
                            newOwnerName: removeTag(getNewOwnerUser.first_name),
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
                    ownerName: removeTag(getUser.first_name)
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

const editCaption = () => {
    return async (ctx, next) => {
      try {
        
        if (!ctx.channelPost) {
          return next();
        }
  
        const { chat, message_id } = ctx.channelPost;
        const channelId = chat.id;
        
        const channelTitle = removeTag(chat.title);
        await updateChannelService({
          channelId,
          title: channelTitle
        });
        
        const channel = await getChannelByChannelID(BigInt(channelId));
        if (!channel) {
          console.log(`Canal não encontrado: ${channelId}`);
          return next();
        }
  
        const getChannel = await ctx.telegram.getChat(channelId).catch(error => {
          console.error(`Erro ao obter informações do canal ${channelId}:`, error);
          return null;
        });
  
        if (!getChannel) {
          return next();
        }
        
        const channelParams = {
          botUsername: `t.me/${ctx.botInfo.username}`,
          title: removeTag(channel.title),
          invite: getChannel.active_usernames?.[0]
            ? `t.me/${getChannel.active_usernames[0]}`
            : getChannel.invite_link
        };
        
        const buttons = channel.buttons.map(btn => ({
          text: btn.text,
          url: btn.url
        }));
        
        const messageType = getMessageType(ctx.channelPost);
        if (!messageType || !channel.settings[messageType]) {
          return next();
        }
        
        await processMessage(ctx, messageType, channel, channelParams, buttons, channelId, message_id);
        
        console.log(`${messageType} editado - (${channelId} - ${chat.title})`);
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
      }
  
      return next();
    };
};


export { channelCommands, addChannel, editCaption, claimOwnerShip }