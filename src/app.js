// Project init
import "dotenv/config"
import { startMiniApp } from "./miniapp/server.js";
import { startBot } from "./bot/bot.js";

(async () => {
    try {
        await startBot()
        await startMiniApp();
    } catch (error) {
        console.log("Erro ao iniciar o projeto: " + error);        
    }
})()