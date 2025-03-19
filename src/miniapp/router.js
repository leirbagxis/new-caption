import { createChannelButtonService, deleteChannelButtonService, getChannelbyId, updateCaptionService, updateChannelbuttonService, updateSettingsService } from "../bot/sevices/channelService.js"
import { getUserById } from "../bot/sevices/userService.js"
import { z } from "zod"

export default async function (fastify, options) {

    // ## Rota get -- Pega os dados
    fastify.get('/user/:userId/:channelId', async (request, reply) => {
        const { userId, channelId } = request.params
        
        try {
            const getUser = await getUserById(userId)
            const getChannel = getUser.channel.find(items => items.channelId === BigInt(channelId))

            if(getUser) {
                const serializedUser = JSON.parse(
                    JSON.stringify(getUser, (key, value) =>
                        typeof value === "bigint" ? value.toString() : value
                    )
                )
    
                const serializedChannel = JSON.parse(
                    JSON.stringify(getChannel, (key, value) =>
                        typeof value === "bigint" ? value.toString() : value
                    )
                )
                
                return reply.code(200).send({ user: serializedUser, channel: serializedChannel });
            }

        } catch (error) {
            return reply.code(404).send({ error: "Channel nao Encontrado"})
        }
        
        
    })

    // ## Rota Salvar Lgendas
    fastify.post('/editar-legenda/:ownerId/:channelId', async (request, reply) => {
        const { ownerId, channelId } = request.params
        const { legenda } = request.body
        console.log(legenda);

        try {
            const update = await updateCaptionService(channelId, ownerId, legenda)

            if(!update) return reply.code(404).send({ error: "Legenda nao Editada"})
            
            return reply.code(200).send("Ok")
        } catch (error) {
            return reply.code(404).send({ error: "Channel nao Encontrado"})
        }
        
        
    })

    // ## Rota Atualizar permissoes
    fastify.put('/atualizar-permissao/:ownerId/:channelId', async (request, reply) => {
        const { ownerId, channelId } = request.params
        const { message, sticker, audio, video, photo, gif  } = request.body
        
        
        
        try {
            const settings = {
                message,
                sticker,
                audio,
                video,
                photo,
                gif
            }

            const update = await updateSettingsService(ownerId, channelId, settings)

            if(!update) return reply.code(404).send({ error: "Legenda nao Editada"})
            
            return reply.code(200).send("Ok")
        } catch (error) {
            return reply.code(404).send({ error: "Channel nao Encontrado"})
        }
        
        
    })

    // ## Rota Atualizar Botoes
    fastify.put('/atualizar-botao/:ownerId/:channelId', async (request, reply) => {
        const { ownerId, channelId } = request.params
        const { buttonName, buttonUrl, buttonId  } = request.body
        
        try {
            const payload = {
                buttonId,
                buttonName,
                buttonUrl
            }

            const update = await updateChannelbuttonService(ownerId, channelId, payload)

            if(!update) return reply.code(404).send({ error: "Button nao Editado"})
            
            return reply.code(200).send("Ok")
        } catch (error) {
            return reply.code(404).send({ error: "Channel nao Encontrado"})
        }
        
        
    })

    // ## Rota Deletar Botoes
    fastify.delete('/deletar-botao/:ownerId/:channelId', async (request, reply) => {
        const { ownerId, channelId } = request.params
        const { buttonId } = request.body
        
        try {

            const del = await deleteChannelButtonService(ownerId, channelId, buttonId)

            if(!del) return reply.code(404).send({ error: "Button nao Editado"})
            
            return reply.code(200).send("Ok")
        } catch (error) {
            return reply.code(404).send({ error: "Channel nao Encontrado"})
        }
        
        
    })

    // ## Rota Criar Botoes
    fastify.post('/adicionar-botao/:ownerId/:channelId', async (request, reply) => {
        const urlSchema = z.string().url()

        const { ownerId, channelId } = request.params
        var { buttonName, buttonUrl } = request.body
        
        try {
            
            if(buttonUrl.startsWith("@")) {
                const fields = buttonUrl.split("@")
                
                if(fields[1].length < 5) return reply.code(404).send({ error: "ButtonUrl Invalido"})
                buttonUrl = "https://t.me/" + fields[1]
            }
            
            urlSchema.parse(buttonUrl)

            const payload = {
                buttonName,
                buttonUrl
            }

            const save = await createChannelButtonService(ownerId, channelId, payload)
            
            if(!save) return reply.code(404).send({ error: "Button nao Criado"})
            
            return reply.code(200).send("Ok")
        } catch (error) {
            return reply.code(404).send({ error: "Channel nao Encontrado"})
        }
        
        
    })
    
}