FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY development-ui/package*.json ./development-ui/
RUN cd development-ui && npm ci --production

COPY . .

RUN npm run build

ENV RUNNING_IN_DOCKER true

EXPOSE 9181
CMD node dist/cjs/src/api/main.js
