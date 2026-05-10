FROM node
WORKDIR /myapp
EXPOSE 3000
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node","server.js"]

