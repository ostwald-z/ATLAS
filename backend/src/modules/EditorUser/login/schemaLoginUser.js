const {z} = require("zod")


const schemaLoginUser = z.object({

    user: z.string(),
    senha: z.string()
})

module.exports = {schemaLoginUser}