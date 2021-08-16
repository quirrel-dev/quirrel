FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

ENV RUNNING_IN_DOCKER true

EXPOSE 9181
CMD node dist/cjs/src/api/main.js
