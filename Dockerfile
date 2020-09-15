FROM node:12

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run-script build

EXPOSE 9181
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
CMD node dist/src/main.js
