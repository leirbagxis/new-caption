import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

const connection = new PrismaClient();

const redisCache = new Redis({
    host: process.env.REDIS_HOST,
    port: 6379
})

export { connection, redisCache }