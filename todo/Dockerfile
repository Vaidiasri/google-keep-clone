# Stage 1: build SPA (Vite env vars are baked in at build time)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_BACKEND_MODE=hybrid
ARG VITE_API_URL_NODE=http://localhost:8080
ARG VITE_API_URL_PYTHON=http://localhost:8000

ENV VITE_BACKEND_MODE=$VITE_BACKEND_MODE \
    VITE_API_URL_NODE=$VITE_API_URL_NODE \
    VITE_API_URL_PYTHON=$VITE_API_URL_PYTHON

RUN npm run build

# Stage 2: serve static files with nginx
FROM nginx:1.27-alpine

RUN apk add --no-cache curl

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
