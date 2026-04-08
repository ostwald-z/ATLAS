const fs = require("fs");
const path = require("path");
const AppError = require("../../../error/AppError");

const repo_deletar_drive = require("./repo.delete")

async function deletar_drive_serice(caminho, id_user, pasta_ou_arquivo) {
    if (!pasta_ou_arquivo) {
        throw new AppError("Não foi definido corretamente se é pasta ou arquivo");
    }

    // 1. Monta a base segura do usuário (mantém resolve aqui para pegar o caminho absoluto da env)
    const pasta_base_usuario = path.resolve(process.env.ATLAS_CLOUD_PATH, String(id_user));

    // 2. CORREÇÃO: Limpa barras iniciais e usa path.join
    // O .replace(/^(\/|\\)+/, '') remove qualquer / ou \ do começo da string
    const caminho_limpo = caminho.replace(/^(\/|\\)+/, '');
    const caminho_final = path.join(pasta_base_usuario, caminho_limpo);

    // 3. SEGURANÇA: Verifica se continua dentro da pasta (agora vai funcionar sempre)
    if (!caminho_final.startsWith(pasta_base_usuario)) {
        throw new AppError("Acesso não autorizado", 403);
    }

    // 4. Verifica se existe no disco
    if (!fs.existsSync(caminho_final)) {
        throw new AppError('Item não encontrado no servidor', 404);
    }

    if (pasta_ou_arquivo === "pasta") {
        try {
            // fs.rmSync é o comando moderno para pastas (recursive deleta tudo dentro)
            fs.rmSync(caminho_final, { recursive: true, force: true });
        } catch (err) {
            console.log('Erro ao deletar a pasta:', err);
            console.error('Erro ao deletar a pasta:', err);
            throw new AppError("Erro ao deletar pasta");
        }

        await repo_deletar_drive.deletar_arquivos_por_pasta_repo(caminho, id_user)

        return;
    }


    // Lógica para Arquivos


    // Deleta do Banco de Dados
    const deletar = await repo_deletar_drive.deletar_drive_repo(caminho, id_user);
    if (deletar.affectedRows === 0) {
        throw new AppError("Arquivo não encontrado no banco.", 404);
    }

    try {
        if (fs.lstatSync(caminho_final).isFile()) {
            fs.unlinkSync(caminho_final);
        }
    } catch (err) {
        console.log('Erro ao deletar o arquivo físico:', err);
        console.error('Erro ao deletar o arquivo físico:', err);
    }


}

module.exports = {deletar_drive_serice}