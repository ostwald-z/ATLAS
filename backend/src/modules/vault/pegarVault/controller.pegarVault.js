const path = require('path');
const fs = require('fs');
const service_pegar_vault = require("./service.pegarVault");

async function pegarVault(req, res, next) {
    try {
        const { vaultName } = req.params;
        const id_user = req.user.id;

        // O service deve retornar o caminho. 
        // Vamos garantir que ele seja absoluto usando path.resolve
        const caminho_bruto = await service_pegar_vault.service_pegar_vault(vaultName, id_user);
        const caminho_vault_completo = path.resolve(caminho_bruto);

        // 1. VALIDAÇÃO CRÍTICA: O arquivo existe mesmo?
        // Se não existir e você der res.sendFile, ele vai gerar um erro que o frontend 
        // vai tentar ler como binário.
        if (!fs.existsSync(caminho_vault_completo)) {
            console.error(`[Vault] Arquivo não encontrado: ${caminho_vault_completo}`);
            return res.status(404).json({ erro: "Arquivo não encontrado no servidor." });
        }


        // 2. CONFIGURAÇÃO DE HEADERS
        // Forçamos binário para o navegador não tentar "corrigir" codificação (UTF-8)
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store'); // Evita que o navegador use versão velha

        // 3. ENVIO DO ARQUIVO
        // Passamos o caminho absoluto. O callback 'err' trata falhas no meio do envio.
        return res.sendFile(caminho_vault_completo, (err) => {
            if (err) {
                // Se o cabeçalho já foi enviado, não podemos usar res.status()
                if (res.headersSent) {
                    console.error("Erro durante a transmissão dos bytes:", err);
                    return;
                }
                next(err);
            }
        });

    } catch (erro) {
        // Se der erro no service ou em qualquer parte antes do envio
        console.error("Erro no controller pegarVault:", erro);
        next(erro)
    }
}

module.exports = { pegarVault };