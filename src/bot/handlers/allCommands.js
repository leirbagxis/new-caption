import { saveUser } from "../sevices/userService.js";
import { cleanCommand, commands, createKeyboard, formatText, removeTag } from "../util.js";

const allCommands = () => async (ctx, next) => {
  // Ignorar grupos ou contextos sem chat
  if (!ctx.chat || ctx.chat.type === "group") return next();
  
  try {
    // Configuração comum para ambos os tipos de interação
    const setupParams = async () => {
      const { id, username } = ctx.botInfo;
      const ownerId = process.env.OWNER_ID || process.env.BOT_TOKEN.split(':')[0];
      const getOwner = await ctx.telegram.getChat(ownerId);
      const user = ctx.from;
      
      const ownerUser = getOwner.username ? `@${getOwner.username}` : removeTag(getOwner.first_name);
      
      const params = {
        userId: user.id,
        firstName: removeTag(user.first_name),
        botId: id,
        botUsername: "@" + username,
        ownerUser
      };
      
      await saveUser(params);
      return params;
    };
    
    // Função auxiliar para enviar respostas
    const sendResponse = async (commandKey, params, replyToId = null) => {
      const { message, buttons } = commands[commandKey];
      const options = {
        parse_mode: "HTML",
        ...createKeyboard(buttons)
      };
      
      if (replyToId) options.reply_to_message_id = replyToId;
      
      return await ctx.reply(formatText(message, params), options);
    };
    
    // Função auxiliar para editar mensagens
    const editResponse = async (commandKey, params) => {
      const { message, buttons } = commands[commandKey];
      return await ctx.editMessageText(formatText(message, params), {
        parse_mode: "HTML",
        ...createKeyboard(buttons)
      });
    };
    
    if (ctx.message?.text) {
      const params = await setupParams();
      const { message_id } = ctx.message;
      const parms = cleanCommand(ctx.message.text);
      
      // Comandos especiais
      if (parms === "start start") return await sendResponse("start", params, message_id);
      if (parms === "start help") return await sendResponse("help", params, message_id);
      
      // Outros comandos
      if (commands[parms]) return await sendResponse(parms, params, message_id);
    }
    
    if (ctx.callbackQuery) {
      const params = await setupParams();
      const { data } = ctx.callbackQuery;
      
      if (data !== "profile.info" && commands[data]) {
        return await editResponse(data, params);
      }
    }
  } catch (error) {
    console.log("Erro no middleware:", error);
    
    if (ctx.callbackQuery) {
      try {
        const { buttons } = commands["start"];
        return await ctx.editMessageText(formatText("<b>❌ Clique no Botão Abaixo!</b>"), {
          parse_mode: "HTML",
          ...createKeyboard(buttons)
        });
      } catch (innerError) {
        console.log("Erro ao recuperar:", innerError);
      }
    }
  }
  
  return next();
};

export { allCommands };