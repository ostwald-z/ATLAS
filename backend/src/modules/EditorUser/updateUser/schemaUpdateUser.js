const {z} = require("zod")

const schemaUpdateUser = z.object({

    user: z.string().optional(),
    senha: z.string().optional(),
    email: z.string().optional(),
    obs: z.string().optional(),
    roleEdit: z.string().optional(),
    nome_completo: z.string().optional()

})

module.exports = {schemaUpdateUser}

