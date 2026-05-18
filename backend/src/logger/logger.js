const pino = require("pino")


const caminho_atlas_logs = process.env.CAMINHO_ATLAS_LOGS

function buildLogger(file, level) {
  return pino(
    {
      level: level,
      base: null,
      timestamp: () => {
        const date = new Date().toLocaleString("sv-SE", {
          timeZone: "America/Sao_Paulo"
        }).replace(" ", "T")

        const br = new Date().toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo"
        })

        return `,"utcBR":"${date}", "horario":"${br}" `
      }
    },
    
    pino.destination(`${caminho_atlas_logs}/${file}`)
  );
}
module.exports = {buildLogger}


