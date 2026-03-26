const sql = require("../../../config/DB")



async function aprovarForm(user, senha, email, obs, role) {
    const comandosql = "INSERT INTO usuarios (user,email,senha_hash,obs,role) VALUES(?,?,?,?,?)"
    const valores = [user,email,senha,obs,role]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}


async function buscarPedido(id) {
    const comandosql = "SELECT * FROM usuarios_pendentes WHERE id = ?"
    const valores = [id]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}


async function buscarUser(user) {
    const comandosql = "SELECT * FROM usuarios WHERE user = ?"
    const valores = [user]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}


async function buscarEmail(email) {
    const comandosql = "SELECT * FROM usuarios WHERE email = ?"
    const valores = [email]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}


async function deletarForm(id) {
    const comandosql = "DELETE FROM usuarios_pendentes WHERE id = ?"
    const valores = [id]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}



module.exports = {aprovarForm, buscarPedido, buscarEmail, buscarUser, deletarForm}