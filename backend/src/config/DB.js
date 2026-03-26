const mysql = require("mysql2/promise")

const conexao = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_SENHA,
    database: process.env.DB_NOME
})


async function tentarConexao(){
    try{

        const conectar = await conexao.getConnection()
        console.log("Database: ON")
        conectar.release();

    }catch(erro){
        console.log("ERRO: " + erro.message);
        process.exit(1)
    }
}

tentarConexao()

module.exports = conexao