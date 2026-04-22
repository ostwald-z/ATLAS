const {z} = require("zod")

const schemaCriarUser = z.object({

    nome_completo: z.string(),
    user: z.string(),
    email: z.string(),
    senha: z.string(),
    obs: z.string(),
    magicCriar: z.string(),
    magicRole: z.string(),
    chaveNoPending: z.string(),
})

module.exports = {schemaCriarUser}