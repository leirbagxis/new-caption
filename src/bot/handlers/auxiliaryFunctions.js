import { applyEntities, createKeyboard, detectParseMode, formatText, logNotMsg, sleep } from "../util.js";

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
  
const processMediaMessage = async(ctx, messageType, channel, channelParams, buttons) => {
    if (messageType === 'gif') {
      await sleep(500); // Evita rate limiting para GIFs
    }
  
    let { caption = '', caption_entities } = ctx.channelPost;
    
    const formatCaption = formatText(channel.caption, channelParams);
    const parsedCaption = detectParseMode(formatCaption);
    const newCaption = applyEntities(`${caption}\n\n${parsedCaption}`, caption_entities);
    
    await ctx.editMessageCaption(newCaption, {
      parse_mode: 'HTML',
      ...createKeyboard(buttons, 1)
    });
}


export { getMessageType, processMessage  }