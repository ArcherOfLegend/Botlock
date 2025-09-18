FROM node:latest

RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

COPY package.json /usr/src/bot
RUN npm install cheerio axios discord.js dotenv

COPY . /usr/src/bot

CMD ["node", "index.js"]

