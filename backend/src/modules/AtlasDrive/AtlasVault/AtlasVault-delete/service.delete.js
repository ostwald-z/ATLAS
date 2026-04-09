const fs = require("fs");
const path = require("path");
const AppError = require("../../../../error/AppError");

/**
 * Service para Deletar arquivos ou pastas.
 * Root: ATLAS_CLOUD_PATH/_vault020/
 */
async function deletar_vault_serice(caminho, pasta_ou_arquivo) {
    
    if (!pasta_ou_arquivo) {
        throw new AppError("Não foi definido corretamente se é pasta ou arquivo");
    }

    // 1. Definição da Raiz (Vault Secreto)
    const base_vault = path.resolve(process.env.ATLAS_CLOUD_PATH, "_vault020");

    // 2. Normalização do caminho (remove barras extras e evita bagunça)
    const caminho_relativo_limpo = caminho
        .replace(/^[\\/]+|[\\/]+$/g, '') // Remove / ou \ do início e do fim
        .replace(/\\/g, '/');           // Padroniza separadores

    // 3. Monta o caminho físico absoluto
    const caminho_final_disco = path.join(base_vault, caminho_relativo_limpo);

    // 4. SEGURANÇA: Anti-Path Traversal (Jailbreak check)
    if (!caminho_final_disco.startsWith(base_vault)) {
        throw new AppError("Acesso não autorizado ao sistema de arquivos", 403);
    }

    // 5. Verifica se o item existe antes de tentar deletar
    if (!fs.existsSync(caminho_final_disco)) {
        throw new AppError(`${pasta_ou_arquivo === 'pasta' ? 'Pasta' : 'Arquivo'} não encontrado no vault.`, 404);
    }

    try {
        if (pasta_ou_arquivo === "pasta") {
            // Garante que é realmente um diretório antes de fazer o rm recursivo
            const stats = fs.statSync(caminho_final_disco);
            if (!stats.isDirectory()) {
                throw new AppError("O item selecionado não é uma pasta.", 400);
            }

            // Deleta a pasta e tudo que tiver dentro ({ recursive: true })
            fs.rmSync(caminho_final_disco, { recursive: true, force: true });
        } 
        else {
            // Lógica para ARQUIVO
            const stats = fs.statSync(caminho_final_disco);
            if (!stats.isFile()) {
                throw new AppError("O item selecionado não é um arquivo.", 400);
            }

            fs.unlinkSync(caminho_final_disco);
        }

        return { 
            status: "sucesso", 
            mensagem: `${pasta_ou_arquivo === 'pasta' ? 'Pasta' : 'Arquivo'} removido com sucesso.`,
            caminho_removido: caminho_relativo_limpo
        };

    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Erro ao deletar no FS:", err);
        throw new AppError("Erro técnico ao excluir o item no servidor.");
    }
}

module.exports = { deletar_vault_serice };
