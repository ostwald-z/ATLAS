const sql = require('../../../config/DB')


async function ligarTOTP_user_banco(id_user) {
    const comandosql = "UPDATE usuarios SET totp=1 WHERE id=?"
    const valores = [id_user]

    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}


async function buscarUser(id_user) {
    const comandosql = "SELECT * FROM usuarios WHERE id=?"
    const valores = [id_user]
    const [resultado] = await sql.query(comandosql, valores)

    return resultado
}



async function colocar_SEED_no_usuario_banco(id_user, seed) {
    
    const comandosql = "INSERT INTO seeds_2fa (user_id, seed) VALUES(?,?)"

    const valores = [id_user, seed]

    const [resultado] = await sql.query(comandosql, valores)

    return resultado

}



module.exports = {ligarTOTP_user_banco, colocar_SEED_no_usuario_banco, buscarUser}