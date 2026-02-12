FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY server/package.json ./server/

# Install dependencies
WORKDIR /app/server
RUN npm install

# Copy all files
WORKDIR /app
COPY . .

# Set working directory for server
WORKDIR /app/server

EXPOSE 3000

CMD ["node", "server.js"]
