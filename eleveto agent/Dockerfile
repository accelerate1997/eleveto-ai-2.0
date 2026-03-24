FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source files
COPY . .

# Expose the agent port
EXPOSE 3002

# Start the agent
CMD ["node", "index.js"]
