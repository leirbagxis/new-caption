import { connection } from "../../database/database.js"

const getChannelbyId = async (ownerId, channelId) => {
    return await connection.channel.findUnique({
        where: {
            ownerId,
            channelId
        },
        include: {
            buttons: true
        }
    })
}

const getChannelByChannelID = async (channelId) => {
    const verify = await connection.channel.findUnique({
        where: {
            channelId
        },
        include: {
            buttons: true
        }
    })

    return verify
}

const deleteChannelById = async (ownerId, channelId) => {
    const verify = await getChannelbyId(ownerId,  channelId)

    if(verify) {
        await connection.buttons.deleteMany({
            where: {
                channelId
            }
        })

        console.log(`Channel deleted succefully - (${verify.channelId} - ${verify.title})`);        
        return await connection.channel.delete({
            where: {
                ownerId,
                channelId
            },
            include: {
                buttons: true
            }
        })
        
    }
}

const saveChannelService = async (channel) => {
    
    try {
        const { ownerId, channelId, title, inviteUrl } = channel
    
        const save = await connection.channel.create({
            data: {
                ownerId,
                channelId,
                title,
                settings: {
                    message: true,
                    sticker: true,
                    audio: true,
                    video: true,
                    photo: true,
                    gif: true
                },
                buttons: {
                    create: {
                        text: title,
                        url: inviteUrl
                    }
                }
            }
        })
        console.log("canal salvo com sucesso: " + channelId);
        return save

    } catch (error) {
        console.log("erro ao salvar um novo canal " + error);
        return false
    }
}

const updateChannelService = async (payload) => {

    try {
        
        const { ownerId, channelId, title, inviteUrl } = payload

        const firstButton = await connection.buttons.findFirst({
            where: {
                channelId
            }
        })

        if (firstButton) {
            const update = await connection.channel.update({
                where: {
                    ownerId
                },
                data: {
                    title,
                    buttons: {
                        update: {
                            where: {
                                id: firstButton.buttonId
                            },
                            data: {
                                text: title,
                                url: inviteUrl
                            }
                        }
                    }
                }
            })

            return update
        }
        
    } catch (error) {
        console.log("erro ao atualizar um canal " + error);
        return false        
    }

}

export { getChannelbyId, getChannelByChannelID, deleteChannelById, saveChannelService, updateChannelService }