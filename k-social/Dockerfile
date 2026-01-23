FROM node:20-alpine AS builder
WORKDIR /app
COPY K/package*.json ./
RUN npm install --legacy-peer-deps
COPY K ./

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 8090
CMD ["sh", "-lc", "npm run dev -- --host 0.0.0.0 --port ${APP_K_SOCIAL_PORT:-8090}"]
