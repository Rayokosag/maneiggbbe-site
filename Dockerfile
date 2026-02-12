FROM node:20-alpine

WORKDIR /app

# Copy frontend files
COPY *.html ./
COPY css ./css
COPY js ./js
COPY images ./images

# Copy server files
COPY server/package.json ./server/
WORKDIR /app/server
RUN npm install --production

COPY server/*.js ./
COPY server/routes ./routes

WORKDIR /app/server

EXPOSE 3000

CMD ["node", "server.js"]
