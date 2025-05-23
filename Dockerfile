FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .


# Rebuild bcrypt for Docker's architecture
RUN npm rebuild bcrypt --build-from-source && \
mkdir -p /app/logs && chmod -R 777 /app/logs

ENV PORT=3000

EXPOSE 3000

CMD [ "npm","start" ]