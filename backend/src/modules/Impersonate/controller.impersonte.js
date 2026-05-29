const serivce = require("./service.impersonate")


const isprod = process.env.NODE_ENV === "prod"


async function impersonateController(req,res,next) {
    try{

        const id = req.params.id
        const {chave} = req.body

        const httpInfo = req.httpInfo


        const {token, roleUser} = await serivce.impersonate(id, chave, httpInfo)


        res.cookie("AcessToken", token, {
            httpOnly: true,
            secure: isprod, // se for prod, aqui será true, do contrário false.
            sameSite: "lax",
            maxAge: 600000 //10 minutos em milisegundos
        })

        res.status(200).json({
            message: "Special Acess Liberado.",
            role: roleUser
        })


    }catch(erro){
        next(erro)
    }
}

module.exports = {impersonateController}