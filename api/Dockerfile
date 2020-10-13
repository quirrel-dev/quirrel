FROM node:12-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run-script build

ENV RUNNING_IN_DOCKER true

EXPOSE 9181
CMD node dist/src/main.js