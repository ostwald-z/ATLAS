const sql = require("../../../config/DB")


async function updateForm(campos, valores) {
    const comandosql = "UPDATE usuarios_pendentes SET " + campos.join(", ") + "WHERE id = ?"
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}


async function buscarUser(user) {
    const comandosql = "SELECT * FROM usuarios WHERE user = ?"
    const valores = [user]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado
}


async function buscarEmail(email) {
    const comandosql = "SELECT * FROM usuarios WHERE email = ?"
    const valores = [email]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}


module.exports = {
    updateForm,
    buscarUser,
    buscarEmail
}