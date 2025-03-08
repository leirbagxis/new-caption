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

const deleteChannelById = async (ownerId, channelId) => {
    const verify = await getChannelbyId(ownerId,  channelId)

    if(verify) {
        //return verify
        
        await connection.buttons.deleteMany({
            where: {
                channelId
            }
        })

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


export { getChannelbyId, deleteChannelById }