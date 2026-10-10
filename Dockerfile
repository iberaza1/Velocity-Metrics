# Build Stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js .
COPY --from=builder /app/package*.json ./

# server.js needs firebase-admin and @google/genai at runtime.
# GEMINI_API_KEY is provided by Cloud Run at runtime, never at build time.
RUN npm ci --omit=dev
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]