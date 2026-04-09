const AppError = require("../../../error/AppError");
const fs = require("fs").promises;
const path = require("path");




async function service_criar_pasta_context(id_user, caminho_da_pasta) {
    const baseStorage = process.env.ATLAS_CLOUD_PATH;
    
    const userRoot = path.join(baseStorage, String(id_user));

    // Limpa a barra inicial do caminho recebido
    const relativePath = caminho_da_pasta.startsWith("/") 
        ? caminho_da_pasta.slice(1) 
        : caminho_da_pasta;

    // Pasta base onde a criação vai ocorrer
    const targetDir = path.join(userRoot, relativePath);

    let folderName = "New Folder";
    let fullPath = path.join(targetDir, folderName);
    let counter = 1;

    // Loop para simular o comportamento do Windows (New Folder, New Folder (1)...)
    while (true) {
        try {
            // Tenta acessar a pasta. Se não der erro, ela existe.
            await fs.access(fullPath);
            
            // Se chegou aqui, a pasta existe. Vamos tentar o próximo nome.
            folderName = `New Folder (${counter})`;
            fullPath = path.join(targetDir, folderName);
            counter++;
        } catch (error) {
            // Se deu erro no access, significa que o caminho está livre!
            break; 
        }
    }

    try {
        // Cria a pasta (recursive: true garante que o caminho do usuário exista)
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

module.exports = {service_criar_pasta_context};
