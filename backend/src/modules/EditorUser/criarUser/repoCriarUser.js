const sql = require("../../../config/DB")


async function criarUser(user,senha,email,role,obs) {
    const comandosql = "INSERT INTO usuarios (user,senha_hash,email,role,obs) VALUES(?,?,?,?,?)"
    const valores = [user,senha,email,role,obs]
    const [resultado] = await sql.query(comandosql, valores)
    return resultado;
}


async function enviarParaAprovacao(user, senha, email, role, obs) {
    const comandosql = "INSERT INTO usuarios_pendentes (user, senha_hash, email, role, obs) VALUES(?,?,?,?,?)"
    const valores = [user,senha,email,role,obs]
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



module.exports = {
    criarUser,
    buscarUser,
    buscarEmail,
    enviarParaAprovacao
}