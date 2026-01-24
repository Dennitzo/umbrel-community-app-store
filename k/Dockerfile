FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . ./

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 5173
CMD ["sh", "-lc", "npm run dev -- --host 0.0.0.0 --port ${APP_K_SOCIAL_PORT:-5173}"]
