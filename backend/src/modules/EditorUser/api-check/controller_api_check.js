


async function check_api_controller(req, res, next) {
    try{


        const user = req.user.id


        //se chegar aqui é porque passou pelo authMiddle e pelo roleMiddle
        //só dar suave.
        res.status(200).json({
            message: "Verificado.",
            user: user
        })


    }catch(erro){
        next(erro)
        console.log("cai no controller, com erro e da next no erro.")
    }
}


module.exports = {check_api_controller}