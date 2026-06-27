FROM node:21-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5001
CMD [ "sh", "-c", "npm run db:setup && npm start" ]
