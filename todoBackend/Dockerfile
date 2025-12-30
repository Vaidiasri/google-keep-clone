# Stage 1: Build TypeScript code
FROM node:18-alpine AS builder

WORKDIR /app

# Package files copy karo
COPY package*.json ./
COPY tsconfig.json ./

# Dependencies install (dev bhi chahiye tsc ke liye)
RUN npm install

# Saara code copy karo
COPY . .

# TypeScript compile karo (dist folder mein output aayega generally)
RUN npx prisma generate
RUN npm run build

# Stage 2: Production image (sirf JS + production deps)
FROM node:18-alpine

WORKDIR /app

# Sirf production dependencies install karo
COPY package*.json ./
RUN npm install --production

# Builder stage se compiled code copy karo
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Agar static files ya kuch aur hai to copy kar lo (optional)
# COPY . .

EXPOSE 8080 
# jo port use kar raha hai wo daal (Fastify default 3000 hi hota hai mostly) 

# Compiled JS file run karo
CMD ["node", "dist/src/index.js"]