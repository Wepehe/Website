FROM node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
COPY server/src ./server/src

RUN mkdir -p /data && chown node:node /data
USER node

ENV HOST=0.0.0.0 PORT=8787 DATA_FILE=/data/contact-submissions.ndjson
EXPOSE 8787

CMD ["node", "server/src/server.js"]
