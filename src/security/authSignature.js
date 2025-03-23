import crypto from "crypto";
const secretKey = process.env.SECRET_KEY || "configura_sua_chave_secreta:2025";

const generationSignedUrl = (userId, channelId) => {
    const data = `${userId}:${channelId}`
    const signature = crypto.createHmac('sha256', secretKey).update(data).digest("hex")

    return `${userId}/${channelId}?signature=${signature}`
}

const validateSignature = (userId, channelId, receivedSignature) => {
    const data = `${userId}:${channelId}` 
    const expectedSignature = crypto.createHmac('sha256', secretKey).update(data).digest("hex")

    return  expectedSignature === receivedSignature
}

export { generationSignedUrl, validateSignature }