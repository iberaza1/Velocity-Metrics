# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js .
COPY --from=builder /app/package*.json ./

# Install production dependencies only (if any are needed for server.js)
# Since server.js only uses built-in modules, we don't technically need npm install here,
# but it's good practice to have the environment ready.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]