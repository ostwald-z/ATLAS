const AppError = require("../../../error/AppError");
const fs = require("fs").promises;
const path = require("path");




async function service_criar_pasta_context(id_user, caminho_da_pasta) {
    const baseStorage = process.env.ATLAS_CLOUD_PATH;
    const userRoot = path.join(baseStorage, String(id_user));

    // Limpa a barra inicial do caminho completo recebido (ex: "/Projetos/Fotos" vira "Projetos/Fotos")
    const relativePath = caminho_da_pasta.startsWith("/") 
        ? caminho_da_pasta.slice(1) 
        : caminho_da_pasta;

    // Separa o diretório pai do nome que o usuário escolheu usando o módulo 'path'
    // Se relativePath for "Fotos", paiDesejado vira "." e nomeDesejado vira "Fotos"
    // Se relativePath for "Projetos/Design", paiDesejado vira "Projetos" e nomeDesejado vira "Design"
    const paiDesejado = path.dirname(relativePath);
    let folderName = path.basename(relativePath);

    // 3. Define a pasta alvo real onde a criação vai acontecer (onde a verificação de duplicado será feita)
    const targetDir = path.join(userRoot, paiDesejado);

    // Guarda o nome original caso precise incrementar o contador (ex: "Fotos", "Fotos (1)", etc.)
    const nomeOriginal = folderName;
    let fullPath = path.join(targetDir, folderName);
    let counter = 1;

    // 4. Loop testando e incrementando o nome que o usuário realmente escolheu
    while (true) {
        try {
            // Tenta acessar a pasta. Se não der erro, ela existe.
            await fs.access(fullPath);
            
            // Se ela já existe, incrementa com o padrão do sistema operacional baseado no nome enviado
            folderName = `${nomeOriginal} (${counter})`;
            fullPath = path.join(targetDir, folderName);
            counter++;
        } catch (error) {
            // Se deu erro no access, significa que o caminho está livre!
            break; 
        }
    }

    try {
        // 5. Cria a pasta final correta (com recursive: true garantindo as pastas pai)
        await fs.mkdir(fullPath, { recursive: true });
        
        return { 
            success: true, 
            name: folderName, 
            fullPath: fullPath 
        };
    } catch (error) {
        throw new AppError(`Erro ao criar pasta no disco: ${error.message}`, 500);
    }
}

module.exports = { service_criar_pasta_context };
