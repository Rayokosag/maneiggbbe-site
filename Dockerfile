FROM node:20-slim

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
WORKDIR /app/server
RUN npm install --production

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
