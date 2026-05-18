# Usa node oficial
FROM node:20

# Pasta da aplicação
WORKDIR /app

# Copia package primeiro
COPY ./backend/package*.json ./

# Instala dependências
RUN npm install

# Copia resto do backend
COPY ./backend .

# Expõe porta
EXPOSE 8080

# Sobe aplicação
CMD ["npm", "start"]
