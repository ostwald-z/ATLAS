const AppError = require("../../../error/AppError");

const fs = require("fs/promises");
const path = require("path");


/**
 * Upload de arquivo usando STREAM (via multer diskStorage)
 *
 * IMPORTANTE:
 * - Aqui NÃO usamos arquivo.buffer
 * - O multer já salvou o arquivo em disco (arquivo.path)
 * - Nós apenas movemos o arquivo para o destino final
 */
async function upload_arquivo_service(arquivo, dono_id, caminho_escolhido = "") {

    if (!arquivo) {
        throw new AppError("Arquivo não enviado", 400);
    }

    // 🔹 Caminho base do usuário
    const basePath = path.join(process.env.ATLAS_CLOUD_PATH, String(dono_id));

    // 🔹 Sanitização do caminho (proteção contra path traversal)
    const safeSubPath = path
        .normalize(caminho_escolhido || "")
        .replace(/^\/+/, "")   // remove barra inicial
        .replace(/\\/g, "/");  // padroniza

    const pastaUsuario = path.join(basePath, safeSubPath);

    // 🔒 Proteção: impede sair da pasta do usuário
    if (!pastaUsuario.startsWith(basePath)) {
        throw new AppError("Caminho inválido", 403);
    }

    // 📁 Garante que a pasta existe
    await fs.mkdir(pastaUsuario, { recursive: true });

    // 🔹 pega nome 
    const nomeOriginal = arquivo.originalname;

    //const caminhoCompleto = path.join(pastaUsuario, nomeOriginal);


    const caminhoOriginalDestino = path.join(pastaUsuario, nomeOriginal);

    const caminhoCompleto = await gerarCaminhoSemConflito(
        caminhoOriginalDestino
    );

    /**
     * ✅ AQUI ESTÁ A MUDANÇA PRINCIPAL
     *
     * Antes:
     *   fs.writeFile(caminhoCompleto, arquivo.buffer)
     *
     * Agora:
     *   movemos o arquivo já salvo pelo multer
     *
     * Isso evita:
     * - carregar o arquivo na RAM
     * - travar o servidor com arquivos grandes
     */
    

    // temos que mudar, usaremos copyFile agora, visando rodar em DOCKER
    //await fs.rename(arquivo.path, caminhoCompleto);

    try{
        await fs.copyFile(arquivo.path, caminhoCompleto)

        // deleta origem pós bem sucedido

        await fs.unlink(arquivo.path)
    }catch(erro){
        console.log("Erro no upload interno: ", erro)

        // tentativa de limpeza do tmp, onde o arquivo ficou salvo primeiramente no Mullter.
        try {
            await fs.unlink(arquivo.path);
            console.log("Arquivo temporário limpo após falha.");
        } catch (erroLimpeza) {
            // Se nem conseguir apagar, só loga. 
            // O Docker costuma limpar /tmp ao reiniciar, então não é crítico.
            console.warn("Falha ao limpar arquivo temporário:", erroLimpeza.message);
        }
        throw new AppError("Erro interno no upload", 500)
    }


    /* 🔹 Caminho relativo (pra salvar no banco)
    const caminhoRelativo = path
        .posix
        .join(safeSubPath, nomeOriginal)
        .replace(/^\/+/, "");
    */


    /*  não precisamos mais salvar no banco, tudo vai se basear no disco.
    const metadata = {
        owner_id: dono_id,
        name: arquivo.originalname,
        path: caminhoRelativo,
        type: arquivo.mimetype,
        size: arquivo.size,
    };

    // 💾 Salva metadata no banco
    const resultado = await repo_upload.upload_arquivo(metadata);

    */


    return "ok";
}



// evita arquivos com o mesmo nome no upload

async function gerarCaminhoSemConflito(caminhoOriginal) {

    const diretorio = path.dirname(caminhoOriginal);

    const extensao = path.extname(caminhoOriginal);

    let nomeBase = path.basename(caminhoOriginal, extensao);

    // remove " (numero)" existente
    nomeBase = nomeBase.replace(/\s\(\d+\)$/, '');

    let contador = 1;

    let caminhoFinal = caminhoOriginal;

    while (true) {

        try {

            await fs.access(caminhoFinal);

            // existe → gera próximo nome
            const novoNome = `${nomeBase} (${contador})${extensao}`;

            caminhoFinal = path.join(diretorio, novoNome);

            contador++;

        } catch {

            // não existe → pode usar
            return caminhoFinal;
        }
    }
}







module.exports = {
    upload_arquivo_service
};