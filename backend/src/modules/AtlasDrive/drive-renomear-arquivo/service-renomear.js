const repo_renomear_arquivo = require("./repo-renomear")
const repo_atualizar_caminho_arquivos = require("./repo-renomear")

const AppError = require("../../../error/AppError")

const fs = require("fs")
const path = require("path")


async function renomear_arquivo(caminho_arquivo, id_de_quem_chama, novo_nome, pasta_ou_arquivo, mover) {
    
    if(!pasta_ou_arquivo){
        console.log("Não foi definido corretamente se é arquivo ou pasta.")
        throw new AppError("Não foi definido corretamente se é arquivo ou pasta.")
    }


    // --- NOVO BLOCO PARA MOVER ---
    if (mover === "sim") {

        const caminhoSeguro = novo_nome.replace(/^\/+/, '').replace(/\\/g, '/');
        const caminhoOrigemSeguro = caminho_arquivo.replace(/^\/+/, '').replace(/\\/g, '/');

        const pasta_usuario = path.resolve(process.env.ATLAS_CLOUD_PATH, String(id_de_quem_chama));

        const caminho_origem_absoluto = path.join(pasta_usuario, caminhoOrigemSeguro);
        const caminho_destino_absoluto = path.join(pasta_usuario, caminhoSeguro);

        const normalizadoOrigem = path.normalize(caminho_origem_absoluto);
        const normalizadoDestino = path.normalize(caminho_destino_absoluto);

        if (!normalizadoOrigem.startsWith(pasta_usuario) || 
            !normalizadoDestino.startsWith(pasta_usuario)) {
            console.log("Acesso não autorizado 403")
            throw new AppError("Acesso não autorizado", 403);
        }

        if (!fs.existsSync(normalizadoOrigem)) {
            console.log("Erro, arquivo ou pasta de origem não existe")
            throw new AppError("O arquivo ou pasta de origem não existe.", 404);
        }

        try {
            const pastaDestinoPai = path.dirname(normalizadoDestino);

            if (!fs.existsSync(pastaDestinoPai)) {
                fs.mkdirSync(pastaDestinoPai, { recursive: true });
            }

            fs.renameSync(normalizadoOrigem, normalizadoDestino);

            if (pasta_ou_arquivo === "arquivo") {
                repo_atualizar_caminho_arquivos.repo_atualizar_caminho_arquivo(
                    caminhoOrigemSeguro,
                    id_de_quem_chama,
                    caminhoSeguro
                );
                
            } else {
                repo_atualizar_caminho_arquivos.repo_atualizar_caminho_arquivos_dentro_de_pasta(
                    caminhoOrigemSeguro,
                    id_de_quem_chama,
                    caminhoSeguro
                );
            }

            return { status: "sucesso", operacao: "mover" };

        } catch (err) {
            console.log("Erro ao mover no FS:", err);
            throw new AppError("Erro técnico ao mover o item no servidor.");
        }
    }


    if (pasta_ou_arquivo === "pasta") {

        const novo_nome_pasta = sanitizarNomePasta(novo_nome)

        const pasta_usuario = path.resolve(process.env.ATLAS_CLOUD_PATH, String(id_de_quem_chama))
        const caminho_completo_com_arquivo_antigo = path.resolve(pasta_usuario, caminho_arquivo)


        //verifica se o caralho existe
        if (!fs.existsSync(pasta_usuario)) {
            console.log("Pasta base do usuario não existe wtf kkkkkkkkkkk")
            throw new AppError("Diretório base não existe", 404);
        }


        //verifica se o caminho com o arquivo existe
        if (!fs.existsSync(caminho_completo_com_arquivo_antigo)){
            console.log("Diretório escolhido não existe")
            throw new AppError("Diretório escolhido não existe")
        }


        // Extraímos apenas a pasta (tudo que vem antes da última barra)
        const pastaPai = path.dirname(caminho_completo_com_arquivo_antigo);


        // Montamos o novo caminho absoluto usando a mesma pasta + o novo nome vindo do front
        const novoNomeSeguro = novo_nome_pasta.replace(/[\\/]/g, '');
        const novo_caminho_com_novo_nome = path.join(pastaPai, novoNomeSeguro);


        // --- VALIDAÇÃO DE SEGURANÇA ---
        // Verificamos se tanto o caminho antigo quanto o novo começam com a pasta_usuario
        if (!caminho_completo_com_arquivo_antigo.startsWith(pasta_usuario) || 
            !novo_caminho_com_novo_nome.startsWith(pasta_usuario)) {
            console.log("Acesso não autorizado: Tentativa de sair do diretório permitido")
            throw new AppError("Acesso não autorizado: Tentativa de sair do diretório permitido.", 403);
        }

        //tenta renomear o caralho
        try {
            fs.renameSync(caminho_completo_com_arquivo_antigo, novo_caminho_com_novo_nome);

            // --- AQUI ESTÁ O PULO DO GATO ---
            // Precisamos calcular o "novo_caminho_relativo" para mandar pro banco
            // Se caminho_arquivo era "fotos" e o novo nome é "viagem", o novo caminho é "viagem"
            // Se caminho_arquivo era "projetos/antigos" e novo nome é "finalizados", vira "projetos/finalizados"
            
            const diretorioPaiRelativo = path.dirname(caminho_arquivo);
            const novo_caminho_relativo = diretorioPaiRelativo === '.' 
                ? novo_nome_pasta 
                : path.join(diretorioPaiRelativo, novo_nome_pasta).replace(/\\/g, '/');

            // Chama a função que criamos para atualizar TUDO no banco (pasta e sub-arquivos)
            await repo_atualizar_caminho_arquivos.repo_atualizar_caminho_arquivos_dentro_de_pasta(
                caminho_arquivo, 
                id_de_quem_chama, 
                novo_caminho_relativo
            );

            return;

        }catch (err) {
            console.log("erro ao renomear pasta: ", err);
            throw new AppError("Erro ao renomear Pasta");}
        }


    if (pasta_ou_arquivo === "arquivo") {
        const renomear_nome_original_no_repo = await repo_renomear_arquivo.repo_renomear_arquivo(novo_nome, caminho_arquivo, id_de_quem_chama)

        if(renomear_nome_original_no_repo.affectedRows === 0){
            console.log("Erro, arquivo nao encontrado no SQL", renomear_nome_original_no_repo.affectedRows)
            throw new AppError("Arquivo não encontrado", 404)
        }

        return;
    }

    throw new AppError("Não foi definido corretamente se é arquivo ou pasta.")



}







// CASO O USUARIO DESEJA RENOMEAR UMA PASTA - SANITIZAMOS A VARIAVEL PRA EVITAR ATAQUES E EXPLORAÇÕES

function sanitizarNomePasta(nome) {
    if (!nome || typeof nome !== 'string') throw new AppError("Nome inválido");

    let nomeLimpo = nome.trim();

    // 1. Remove caracteres proibidos universais (Windows/Linux)
    // < > : " / \ | ? * e caracteres de controle ASCII
    const regexCaracteresProibidos = /[<>:"/\\|?*\x00-\x1F]/g;
    nomeLimpo = nomeLimpo.replace(regexCaracteresProibidos, '');

    // 2. Remove pontos e espaços extras no FINAL do nome (Proibido no Windows)
    nomeLimpo = nomeLimpo.replace(/[.\s]+$/g, '');

    // 3. Verifica Nomes Reservados do Windows (Case-Insensitive)
    // O regex garante que pegue o nome exato (ex: 'con' ou 'con.txt')
    const regexNomesReservados = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
    
    if (regexNomesReservados.test(nomeLimpo)) {
        // Se for reservado, podemos ou lançar erro ou prefixar algo
        nomeLimpo = `pasta_${nomeLimpo}`; 
    }

    // 4. Previne ocultação ou subida de nível (../ ou .nome)
    if (nomeLimpo.startsWith('.')) {
        nomeLimpo = nomeLimpo.replace(/^\.+/, '');
    }

    // 5. Validação Final de Segurança e Tamanho
    if (!nomeLimpo || nomeLimpo.length === 0) {
        throw new AppError("O nome da pasta resultou em uma string vazia ou inválida.", 400);
    }

    return nomeLimpo.substring(0, 255); // Limite de 255 caracteres padrão de sistemas de arquivos
}


module.exports = {renomear_arquivo}