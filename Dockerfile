FROM node:22-alpine

WORKDIR /app

# Instala dependências para o Prisma Client
RUN apk add --no-cache openssl

# Copia os arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências
RUN npm install

# Gera o Prisma Client
RUN npx prisma generate
RUN npx prisma migrate deploy
# Copia o restante do código
COPY . .

# Expõe a porta para a aplicação
EXPOSE 7000

# Verifica se a variável de ambiente DATABASE_URL está definida
# e então executa as migrações do Prisma antes de iniciar a aplicação
CMD ["/bin/sh", "-c", "npx prisma migrate deploy && npm start"]