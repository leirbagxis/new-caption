import { redisCache } from "../../database/database.js"
import { randomId } from "../util.js"

const createCache = async (payload) => {
    const { channelId, title } = payload
    const key = randomId(5)
    payload = JSON.stringify({ key, channelId, title })
    const save = await redisCache.set(key, payload, "EX", 86400);

    if(save === "OK") {
        return await redisCache.get(key)
    }
}

const getCacheSession = async (cacheId) => {
    const info = await redisCache.get(cacheId)
    if(!info) return false

    return JSON.parse(info)
}

const deleteCache = async (cacheId) => {
    return await redisCache.del(cacheId)
}


export { createCache, getCacheSession, deleteCache }