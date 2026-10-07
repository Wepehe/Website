FROM node:24-alpine

WORKDIR /opt/dev-server

COPY package.json package-lock.json dev-server.js ./
RUN npm ci

EXPOSE 8080

CMD ["npm", "run", "dev"]
