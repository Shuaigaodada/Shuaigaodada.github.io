FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs blackjack-engine.mjs cloudbase-rpc.mjs duel-rooms.mjs awakened-rules.mjs awakened-cards.mjs classic-rules.mjs ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]
