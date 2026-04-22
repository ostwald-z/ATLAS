const {z} = require("zod")

const schemaUpdateUser = z.object({

    user: z.string(),
    senha: z.string(),
    email: z.string(),
    obs: z.string(),
    roleEdit: z.string(),
    nome_completo: z.string()

})

module.exports = {schemaUpdateUser}

