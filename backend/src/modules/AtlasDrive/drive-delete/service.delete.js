const fs = require("fs");
const path = require("path");
const AppError = require("../../../error/AppError");
const repo_deletar_drive = require("./repo.delete");

async function deletar_drive_serice(caminho, id_user, pasta_ou_arquivo) {
    if (!pasta_ou_arquivo) {
        throw new AppError("Não foi definido corretamente se é pasta ou arquivo");
    }

    // 1. NORMALIZAÇÃO DO CAMINHO RELATIVO (A "Mágica" para o banco)
    // Remove barras iniciais e converte contra-barras (Windows) em barras normais
    // Isso garante que o caminho usado no banco seja sempre "pasta/arquivo"
    const caminho_relativo_limpo = caminho
        .replace(/^(\/|\\)+/, '') // Remove / ou \ do início
        .replace(/\\/g, '/');     // Garante que no banco use sempre '/' (opcional, mas recomendado)

    // 2. Monta a base segura do usuário
    const pasta_base_usuario = path.resolve(process.env.ATLAS_CLOUD_PATH, String(id_user));

    // 3. Monta o caminho físico para o FS (O path.join cuida dos separadores do SO)
    const caminho_final_disco = path.join(pasta_base_usuario, caminho_relativo_limpo);

    // 4. SEGURANÇA: Anti-Path Traversal
    if (!caminho_final_disco.startsWith(pasta_base_usuario)) {
        throw new AppError("Acesso não autorizado", 403);
    }

    // 5. Lógica para PASTA
    if (pasta_ou_arquivo === "pasta") {
        if (fs.existsSync(caminho_final_disco)) {
            try {
                fs.rmSync(caminho_final_disco, { recursive: true, force: true });
            } catch (err) {
                console.log("Erro ao deletar pasta física: ", err)
                throw new AppError("Erro ao deletar pasta física");
            }
        }
        // No banco, enviamos o caminho limpo (sem barra)
        // await repo_deletar_drive.deletar_arquivos_por_pasta_repo(caminho_relativo_limpo, id_user);
        return;
    }

    // 6. Lógica para ARQUIVO
    // Primeiro deletamos no Banco (usando o caminho limpo)
    // const deletar = await repo_deletar_drive.deletar_drive_repo(caminho_relativo_limpo, id_user);
    
    /*
    if (deletar.affectedRows === 0) {
        // Se não achou com o caminho limpo, o arquivo não existe no banco
        throw new AppError("Arquivo não encontrado no banco.", 404);
    }
    
    */

    // Depois deletamos no Disco
    try {
        if (fs.existsSync(caminho_final_disco) && fs.lstatSync(caminho_final_disco).isFile()) {
            fs.unlinkSync(caminho_final_disco);
        }
    } catch (err) {
        console.error('Erro ao deletar o arquivo físico:', err);
        throw new AppError("Erro ao deletar arquivo físico", 500)
    }
}

module.exports = { deletar_drive_serice };
