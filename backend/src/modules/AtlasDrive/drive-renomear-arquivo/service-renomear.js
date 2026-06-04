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

            const destinoSemConflito = gerarCaminhoSemConflito(normalizadoDestino);

            fs.promises.rename(normalizadoOrigem, destinoSemConflito);

            return { status: "sucesso", operacao: "mover" };

        } catch (err) {
            console.log("Erro ao mover no FS:", err);
            throw new AppError("Erro técnico ao mover o item no servidor.");
        }
    }


    if (pasta_ou_arquivo === "pasta") {

        const caminhoSeguro = caminho_arquivo.replace(/^\/+/, '').replace(/\\/g, '/');

        const novo_nome_pasta = sanitizarNomePasta(novo_nome)

        const pasta_usuario = path.join(process.env.ATLAS_CLOUD_PATH, String(id_de_quem_chama))
        const caminho_completo_com_arquivo_antigo = path.join(pasta_usuario, caminhoSeguro)


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
            const caminhoFinalSemConflito = gerarCaminhoSemConflito(novo_caminho_com_novo_nome);

            await fs.promises.rename(caminho_completo_com_arquivo_antigo, caminhoFinalSemConflito);

            return { status: "sucesso", operacao: "renomear_pasta" }; // ← return aqui
        }catch (err) {
            console.log("erro ao renomear pasta: ", err);
            throw new AppError("Erro ao renomear Pasta");
        }
    }
    

    if (pasta_ou_arquivo === "arquivo") {

        const caminhoSeguro = caminho_arquivo.replace(/^\/+/, '').replace(/\\/g, '/');

        const novo_nome_arquivo_sanitizado = sanitizarNomePasta(novo_nome); // reutiliza o sanitizador existente

        const pasta_usuario = path.join(process.env.ATLAS_CLOUD_PATH, String(id_de_quem_chama));
        const caminho_completo_arquivo_antigo = path.join(pasta_usuario, caminhoSeguro);

        // Verifica se a pasta base do usuário existe
        if (!fs.existsSync(pasta_usuario)) {
            console.log("Pasta base do usuario não existe");
            throw new AppError("Diretório base não existe", 404);
        }

        // Verifica se o arquivo de origem existe
        if (!fs.existsSync(caminho_completo_arquivo_antigo)) {
            console.log("Arquivo escolhido não existe");
            throw new AppError("Arquivo escolhido não existe", 404);
        }

        // Monta o novo caminho: mesma pasta pai + novo nome
        const pastaPai = path.dirname(caminho_completo_arquivo_antigo);
        const novoNomeSeguro = novo_nome_arquivo_sanitizado.replace(/[\\/]/g, '');
        const novo_caminho_com_novo_nome = path.join(pastaPai, novoNomeSeguro);

        // Validação de segurança: impede path traversal
        if (!caminho_completo_arquivo_antigo.startsWith(pasta_usuario) ||
            !novo_caminho_com_novo_nome.startsWith(pasta_usuario)) {
            console.log("Acesso não autorizado: Tentativa de sair do diretório permitido");
            throw new AppError("Acesso não autorizado: Tentativa de sair do diretório permitido.", 403);
        }

        // Renomeia no disco, evitando conflito de nomes
        try {
            const caminhoFinalSemConflito = gerarCaminhoSemConflito(novo_caminho_com_novo_nome);
            await fs.promises.rename(caminho_completo_arquivo_antigo, caminhoFinalSemConflito);
            return { status: "sucesso", operacao: "renomear_arquivo" };
        } catch (err) {
            console.log("erro ao renomear arquivo: ", err);
            throw new AppError("Erro ao renomear arquivo");
        }
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





// evitamos nomes duplicados, para pastas e arquivos, no mover e renomear

function gerarCaminhoSemConflito(caminhoDestinoOriginal) {

    const diretorio = path.dirname(caminhoDestinoOriginal);

    const extensao = path.extname(caminhoDestinoOriginal);

    let nomeArquivo = path.basename(caminhoDestinoOriginal, extensao);

    // remove " (numero)" do final
    nomeArquivo = nomeArquivo.replace(/\s\(\d+\)$/, '');

    let contador = 1;

    let caminhoFinal = caminhoDestinoOriginal;

    while (fs.existsSync(caminhoFinal)) {

        const novoNome = `${nomeArquivo} (${contador})${extensao}`;

        caminhoFinal = path.join(diretorio, novoNome);

        contador++;
    }

    return caminhoFinal;
}



module.exports = {renomear_arquivo}