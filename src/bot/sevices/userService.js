import { connection } from "../../database/database.js"

const getUserById = async (userId) => {
    const findUser = await connection.user.findUnique({
        where: {
            userId
        },
        include: {
            channel: {
                include: {
                    buttons: true
                }
            }
        }
    })

    return findUser
}

const saveUser = async (user) => {
    const { userId, firstName } = user

    const save = await connection.user.upsert({
        where: {
            userId: BigInt(userId)
        },
        update: {
            firstName
        },
        create: {
            userId: BigInt(userId),
            firstName
        }
    })

    return save
    

}

export { getUserById, saveUser }