// funcs auxiliar
import fs from "fs";
import yaml from "js-yaml";
import { Markup } from "telegraf";

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


export { commands, cleanCommand, formatText, createKeyboard, formatDate }