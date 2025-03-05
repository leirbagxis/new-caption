import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import path from "path";
import { fileURLToPath } from "url";

const startMiniApp = async () => {
    const server = Fastify()

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    server.register(import('@fastify/static'), {
        root: path.join(__dirname, 'public'),
        prefix: '/', 
    });

    server.register(fastifyCors, {
        origin: "*"
    })

    server.get('/', async (request, reply) => {
        return reply.sendFile('index.html');
    });

    server.get('/api', (request, reply) => {
        reply.send({ hello: 'world' })
    })
    
    // Run the server!
    server.listen({ port: process.env.APP_PORT || 3333 }).then(() => {
        console.log("Server Start");    
    })
}

export { startMiniApp }