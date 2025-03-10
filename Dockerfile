FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Rebuild bcrypt for Docker's architecture
RUN npm rebuild bcrypt --build-from-source

ENV PORT=3000

ENV Stage=prod

# Copy the specific environment file
COPY .env.stage.prod .env.stage.prod

EXPOSE 3000

CMD [ "npm","start" ]