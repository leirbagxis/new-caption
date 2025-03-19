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
        const { ownerId, channelId, title, inviteUrl, caption } = channel
    
        const save = await connection.channel.create({
            data: {
                ownerId,
                channelId,
                title,
                caption,
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

        if(!save) return false;

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
                    channelId
                },
                data: {
                    title,
                    buttons: {
                        update: {
                            where: {
                                buttonId: firstButton.buttonId
                            },
                            data: {
                                text: title,
                                url: inviteUrl || firstButton.url
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

const updateOwnerChannelService = async (channelId, newOwnerId) => {
    const getChannel = await getChannelByChannelID(channelId)

    if (getChannel) {
        const update = await connection.channel.update({
            where: {
                channelId
            },
            data: {
                ownerId: newOwnerId
            },
            include: {
                owner: true
            }
        })
        if(update) {
            console.log("mudanca de owner no canal " + channelId);
            
            return update
        }

        return false
    }

    return false
}

export { getChannelbyId, getChannelByChannelID, deleteChannelById, saveChannelService, updateChannelService, updateOwnerChannelService }