import { getChannelByChannelID } from "../sevices/channelService.js";
import { applyEntities, createKeyboard, detectParseMode, formatText, logNotMsg, removeTag, sleep } from "../util.js";
//const groupedMessagesMap = {};

const getMessageType = (channelPost) => {
    if (channelPost.text) return 'message';
    if (channelPost.audio) return 'audio';
    if (channelPost.sticker) return 'sticker';
    if (channelPost.video) return 'video';
    if (channelPost.photo) return 'photo';
    if (channelPost.animation) return 'gif';
    return null;
}

const processMessage = async (ctx, messageType, channel, channelParams, buttons, channelId, messageId) => {
    try {
      switch (messageType) {
        case 'message':
          await processTextMessage(ctx, channel, channelParams, buttons);
          break;
        case 'audio':
          await processAudioMessage(ctx, channel, channelParams, buttons, channelId, messageId);
          break;
        case 'sticker':
          await processStickerMessage(ctx, channel, buttons);
          break;
        case 'video':
        case 'photo':
        case 'gif':
          await processMediaMessage(ctx, messageType, channel, channelParams, buttons);
          break;
      }
    } catch (error) {
      console.error(`Erro ao processar mensagem do tipo ${messageType}:`, error);
      await logNotMsg(ctx, messageTypeToDisplayName(messageType));
    }
}

const messageTypeToDisplayName = (messageType) => {
    const displayNames = {
      message: 'Mensagem',
      audio: 'Audio',
      sticker: 'Sticker',
      video: 'Video',
      photo: 'Imagem',
      gif: 'Animation'
    };
    return displayNames[messageType] || messageType;
}
  
const processTextMessage = async (ctx, channel, channelParams, buttons) => {
    const { text, entities } = ctx.channelPost;
    const caption = formatText(channel.caption, channelParams);
    const parsedCaption = detectParseMode(caption);
    const newCaption = applyEntities(`${text}\n\n${parsedCaption}`, entities);
    
    await ctx.editMessageText(newCaption, {
      parse_mode: 'HTML',
      ...createKeyboard(buttons, 1)
    });
}
  
const processAudioMessage = async (ctx, channel, channelParams, buttons, channelId, messageId) => {
    await sleep(500); // Evita rate limiting
    const caption = formatText(channel.caption, channelParams);
    const parsedCaption = detectParseMode(caption);
    const { media_group_id, audio } = ctx.channelPost;
  
    if (media_group_id) {
      try {
        const userButton = channel.buttons.map(btn => [{
          text: btn.text,
          url: btn.url
        }]);
        
        const edit = await ctx.replyWithAudio(audio.file_id, {
          caption: formatText(parsedCaption),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: userButton
          }
        });
        
        await ctx.deleteMessage(messageId);
        return edit;
      } catch (error) {
        console.error('Erro ao processar áudio em grupo:', error);
      }
    }
    
    await ctx.telegram.editMessageCaption(
      channelId, 
      messageId, 
      null, 
      formatText(parsedCaption), 
      {
        parse_mode: 'HTML',
        ...createKeyboard(buttons, 1)
      }
    );
}
  
const processStickerMessage = async (ctx, channel, buttons) => {
    const userButton = channel.buttons.map(btn => [{
      text: btn.text,
      url: btn.url
    }]);
  
    await ctx.editMessageReplyMarkup({
      inline_keyboard: userButton
    });
}

// Editar Fotos, videos em grupos
const groupedMessagesMap = new Map();

const processMediaMessage = async(ctx, messageType, channel, channelParams, buttons) => {
    const channelPost = ctx.channelPost;
    const { media_group_id: groupId, message_id: messageId, caption = '', caption_entities } = channelPost;
    
    if (groupId) {
        await handleGroupedMessage(ctx, channelPost, messageId, groupId);
        return;
    }
    
    await editMessageCaption(ctx, {
        caption,
        caption_entities,
        channelCaption: channel.caption,
        channelParams,
        buttons
    });
}

async function handleGroupedMessage(ctx, message, messageId, groupId) {
    if (!groupedMessagesMap.has(groupId)) {
        groupedMessagesMap.set(groupId, {
            messages: [],
            timeoutId: null
        });
    }
    
    const group = groupedMessagesMap.get(groupId);
    
    group.messages.push({
        messageId,
        message,
        context: ctx
    });
    
    if (group.timeoutId) {
        clearTimeout(group.timeoutId);
    }
    
    group.timeoutId = setTimeout(() => {
        processGroupedMessages(groupId)
            .finally(() => {
              groupedMessagesMap.delete(groupId);
            });
    }, 1000);
}

function prepareCaption(originalCaption, captionEntities, channelCaption, channelParams) {
    const formatCaption = formatText(channelCaption, channelParams);
    const parsedCaption = detectParseMode(formatCaption);
    
    return {
        text: originalCaption ? `${originalCaption}\n\n${parsedCaption}` : parsedCaption,
        entities: captionEntities
    };
}

async function editMessageCaption(ctx, options) {
    const { caption, caption_entities, channelCaption, channelParams, buttons, chatId, messageId } = options;
    
    const { text, entities } = prepareCaption(caption, caption_entities, channelCaption, channelParams);
    const newCaption = entities ? applyEntities(text, entities) : text;
    
    const editOptions = {
        parse_mode: 'HTML',
        ...createKeyboard(buttons, 1)
    };
    
    try {
        if (chatId && messageId) {
          
            await ctx.telegram.editMessageCaption(
                chatId,
                messageId,
                undefined,
                newCaption,
                editOptions
            );
        } else {
            // Editar mensagem atual
            await ctx.editMessageCaption(newCaption, editOptions);
        }
    } catch (error) {
        console.error('Erro ao editar legenda:', error.message);
    }
}

async function processGroupedMessages(groupId) {
    const group = groupedMessagesMap.get(groupId);
    
    if (!group || group.messages.length === 0) {
        return;
    }
    
    await editGroupedMessages(group.messages);
}

async function editGroupedMessages(messages) {
    if (messages.length === 0) return;
    
    try {
        const firstMsg = messages[0];
        const ctx = firstMsg.context;
        const chatId = ctx.chat.id;
        
        const [channel, getChannel] = await Promise.all([
            getChannelByChannelID(chatId),
            ctx.telegram.getChat(chatId).catch(error => {
                console.error(`Erro ao obter informações do canal ${chatId}:`, error.message);
                return null;
            })
        ]);
        
        if (!getChannel) return;
        
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
        
        const messageWithCaption = messages.find(msg => msg.message.caption);
        const messageIdToEdit = messageWithCaption?.messageId || firstMsg.messageId;
        const caption = messageWithCaption?.message.caption || '';
        const caption_entities = messageWithCaption?.message.caption_entities;
        
        await editMessageCaption(ctx, {
            caption,
            caption_entities,
            channelCaption: channel.caption,
            channelParams,
            buttons,
            chatId,
            messageId: messageIdToEdit
        });
        
    } catch (error) {
        console.error('Erro ao editar mensagens agrupadas:', error.message);
    }
}


export { getMessageType, processMessage  }