import { connection } from "../../database/database.js"

const getChannelbyId = async (ownerId, channelId) => {
    return await connection.channel.findUnique({
        where: {
            ownerId,
            channelId
        },
        include: {
            buttons: true
        },
    })
}

const getChannelByChannelID = async (channelId) => {
    const verify = await connection.channel.findUnique({
        where: {
            channelId
        },
        include: {
            buttons: {
                orderBy: { createAt: 'asc' }
            }
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

        const firstButton = await connection.buttons.findMany({
            where: {
                channelId
            }
        })       
        

        if (firstButton.length > 0) { 
            const oldestButton = firstButton.reduce((oldest, button) => {
                return button.createAt < oldest.createAt ? button : oldest;
            });
            
            const update = await connection.channel.update({
                where: {
                    channelId
                },
                data: {
                    title,
                    buttons: {
                        update: {
                            where: {
                                buttonId: oldestButton.buttonId
                            },
                            data: {
                                text: title,
                                url: inviteUrl || oldestButton.url
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

const updateCaptionService = async (channelId, ownerId, caption) => {
    
    try {
        
        const getChannel = await getChannelbyId(ownerId, channelId);
    
        if(!getChannel) return false
    
        const update = await connection.channel.update({
            where: {
                channelId: getChannel.channelId,
                ownerId: getChannel.ownerId
            },
            data: {
                caption
            }
        })
        if (!update) return false
    
        console.log("legenda atualizada com sucesso no canal: " + channelId);
        return update

        
    } catch (error) {
        return error
    }
}

const updateSettingsService = async(ownerId, channelId, settings) => {
    
    try {
        const getChannel = await getChannelbyId(ownerId, channelId)
    
        if(!getChannel) return false
    
    
        const update = await connection.channel.update({
            where: {
                channelId,
            },
            data: {
                settings
            }
        })        
    
        if(!update) return false
    
        console.log("permissoes do canal alteradas: " + channelId);
        return update
        
    } catch (error) {
        return error
    }
}

const updateChannelbuttonService = async (ownerId, channelId, payload) => {
    
    try {
        
        const { buttonId, buttonName, buttonUrl } = payload

        const getChannel = await getChannelbyId(ownerId, channelId)

        if(!getChannel) return false

        const update = await connection.buttons.update({
            where: {
                channelId,
                buttonId
            },
            data: {
                text: buttonName,
                url: buttonUrl
            }
        })

        if(!update) return false

        console.log("botao atualizado com sucesso no canal: " + channelId);
        return update

    } catch (error) {
        return error
    }
}

const deleteChannelButtonService = async (ownerId, channelId, buttonId) => {

    try {

        const getChannel = await getChannelbyId(ownerId, channelId)
        if (!getChannel) return false

        const del = await connection.buttons.delete({
            where: {
                channelId,
                buttonId
            }
        })
        if(!del) return false
        
        console.log("botao deletado com sucesso no canal: " + channelId);        
        return del        
        
    } catch (error) {
        return error    
    }

}

const createChannelButtonService = async (ownerId, channelId, payload) => {

    try {
        const getChannel = await getChannelbyId(ownerId, channelId)
        if (!getChannel) return false

        const { buttonName, buttonUrl } = payload
        const create = await connection.buttons.create({
            data: {
                channelId,
                text: buttonName,
                url: buttonUrl
            }
        })
        if (!create) return false
        
        console.log("botao criado com sucesso no canal: " + channelId);        
        return create
        
    } catch (error) {
        return error
    }
} 

export { getChannelbyId, getChannelByChannelID, deleteChannelById, saveChannelService, updateChannelService, updateOwnerChannelService, updateCaptionService, updateSettingsService, updateChannelbuttonService, deleteChannelButtonService, createChannelButtonService }