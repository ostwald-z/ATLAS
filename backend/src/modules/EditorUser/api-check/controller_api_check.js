const sql = require('../../../config/DB')


async function buscarUser(id) {
    const comandosql = "SELECT * FROM usuarios WHERE id=?"
    const valores = [id]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado;

}



async function check_api_controller(req, res, next) {
    try{


        const id_user = req.user.id
        const role_user = req.user.role


        const [usuario] = await buscarUser(id_user)


        //se chegar aqui é porque passou pelo authMiddle e pelo roleMiddle
        //só dar suave.s
        res.status(200).json({
            message: "Verificado.",
            user: id_user,
            role_user: role_user,
            username: usuario.user,
            name: usuario.nome_completo,
            email: usuario.email,
            obs: usuario.obs

        })


    }catch(erro){
        next(erro)
        console.log("cai no controller, com erro e da next no erro.")
    }
}


module.exports = {check_api_controller}