const sql = require("../../../config/DB")


async function buscarUser(user) {
    const comandosql = "SELECT * FROM usuarios WHERE user = ?"
    const valores = [user]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}





module.exports = {
    buscarUser,
}