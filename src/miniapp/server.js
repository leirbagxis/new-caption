import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./router.js"

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
    server.get('/:userId/:channelID', async (request, reply) => {
        return reply.sendFile('index.html');
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