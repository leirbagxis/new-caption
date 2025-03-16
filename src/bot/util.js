// funcs auxiliar
import fs from "fs";
import yaml from "js-yaml";
import { Markup } from "telegraf";
import { getChannelByChannelID } from "./sevices/channelService.js";

const commands = yaml.load(fs.readFileSync('./src/bot/commands.yml', 'utf-8')).commands;

const cleanCommand = (cmd) => {
  return cmd.replace(/[^\w\s]/g, "");
}

const formatText = (text, params = {}) => {
  if(!params.botId) {
    params.botId = process.env.BOT_TOKEN.split(":")[0];
  }

  return text.replace(/{(\w+)}/g, (_,key) => params[key] || `${key}`)
}

const formatButtons = (yamlObj, params = {}) => {
  if (!params.webAppUrl) {
    params.webAppUrl = process.env.WEBAPP_URL
  }

  const formatValue = (value) => {
    if (typeof value === "string") {
      return value.replace(/{([\w.]+)}/g, (_, key) => {
        const keys = key.split(".");
        return keys.reduce((acc, curr) => acc && acc[curr], params) || `{${key}}`;
      });
    } else if (Array.isArray(value)) {
      return value.map(formatValue);
    } else if (typeof value === "object" && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, formatValue(v)])
      );
    }
    return value;
  };

  return formatValue(yamlObj);
};

const createKeyboard = (dynamicButtons = [], columns = 2) => {
  const buttons = [
    ...dynamicButtons.map(btn => {
      if (btn.webApp) return Markup.button.webApp(btn.text, btn.webApp);
      if (btn.url) return Markup.button.url(btn.text, btn.url);
      if (btn.callback_data) return Markup.button.callback(btn.text, btn.callback_data);
      return null;
    }).filter(Boolean),
  ]

  return Markup.inlineKeyboard(
    buttons.reduce((rows, btn, i) => {
      if(i % columns === 0) rows.push([]);
      rows[rows.length - 1].push(btn);
      return rows
    }, []
  )
  )
}

const formatDate = (date) => {
  const ndate = new Date(date)
  const day = String(ndate.getDate()).padStart(2, '0')
  const month = String(ndate.getMonth() + 1).padStart(2, '0')
  const year= ndate.getFullYear()

  return `${day}/${month}/${year}`
}

const randomId = (tamanho) => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let resultado = '';
  for (let i = 0; i < tamanho; i++) {
      const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
      resultado += caracteres.charAt(indiceAleatorio);
  }
  return resultado;
}

const applyEntities = (text, entities = []) => {
  let openTags = {};
  let closeTags = {};
  
  const tagMap = {
      bold: 'b',
      blockquote: 'blockquote',
      italic: 'i',
      underline: 'u',
      strikethrough: 's',
      code: 'code',
      spoiler: 'tg-spoiler'
  };

  entities.forEach(({ offset, length, type }) => {
      let tag = tagMap[type];
      if (!tag) return;

      if (!openTags[offset]) openTags[offset] = [];
      if (!closeTags[offset + length]) closeTags[offset + length] = [];

      openTags[offset].push(`<${tag}>`);
      closeTags[offset + length].unshift(`</${tag}>`);  
  });

  let result = '';
  for (let i = 0; i < text.length; i++) {
      if (openTags[i]) result += openTags[i].join('');
      result += text[i];
      if (closeTags[i + 1]) result += closeTags[i + 1].join('');
  }

  return result;
};

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const logNotMsg = async (ctx, type) => {
  const { chat, message_id } = ctx.channelPost
  const bot = ctx.botInfo
  const getChannel = await getChannelByChannelID(BigInt(chat.id))
  
  const channelIdMerge = String(chat.id).split("-100")
  const messageLink = `https://t.me/c/${channelIdMerge[1]}/${message_id}`

  return ctx.telegram.sendMessage(Number(getChannel.ownerId), `<b>⚠ <a href='${messageLink}'>${type}</a> • Não foi possivel editar</b>`, {
    parse_mode: "HTML"
  })
  
}

export { commands, cleanCommand, formatText, createKeyboard, formatDate, randomId, applyEntities, sleep, logNotMsg, formatButtons }