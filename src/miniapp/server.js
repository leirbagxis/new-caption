import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./router.js"
import { validateSignature } from "../security/authSignature.js";
import { getChannelbyId } from "../bot/sevices/channelService.js";

const startMiniApp = async () => {
    const server = Fastify()

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    server.register(import('@fastify/static'), {
        root: path.join(__dirname, 'public'),
        prefix: '/public', 
    });

    
    server.register(fastifyCors, {
        origin: "*"
    })
    
    // exite html para usuario especifico
    server.get('/:userId/:channelId', async (request, reply) => {
        try {
            const { userId, channelId } = request.params
            const { signature } = request.query

            if (!validateSignature(userId, channelId, signature)) {
                return reply.status(403).send({ error: "Assinatura Invalida"})
            }

            if (!(await getChannelbyId(userId, channelId))) {
                return reply.status(403).send({ error: "Acesso Negado"})
            }
            
            return reply.sendFile('index.html');
        } catch (error) {
            
        }
        
    });
    
    server.register(apiRouter, { prefix: "/api" })
    
    server.get('/', (request, reply) => {
        reply.send({ hello: 'world' })
    })
    
    // Run the server!
    server.listen({
        port: process.env.APP_PORT || 3333,
        host: "0.0.0.0"
    }).then(() => {
        console.log("Server Start " + process.env.APP_PORT);    
    })
}

export { startMiniApp }