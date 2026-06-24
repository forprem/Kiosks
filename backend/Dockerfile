FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --include=dev; else npm install --include=dev; fi
RUN npm rebuild @prisma/client

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./tsconfig.json

RUN node ./node_modules/prisma/build/index.js generate --schema=./prisma/schema.prisma
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["npm", "start"]
