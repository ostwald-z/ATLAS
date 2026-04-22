const serivce = require("./service.impersonate")
const repo = require("./repo.impersonate")

async function impersonateController(req,res,next) {
    try{

        const id = req.params.id
        const {chave} = req.body

        const [user] = await repo.buscarID(id)

        const httpInfo = req.httpInfo


        const token = await serivce.impersonate(id, chave, httpInfo)

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 600000 //10 minutos em milisegundos
        })

        res.status(200).json({
            message: "Special Acess Liberado.",
            role: user.role
        })


    }catch(erro){
        next(erro)
    }
}

module.exports = {impersonateController}