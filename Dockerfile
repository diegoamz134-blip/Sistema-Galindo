# Dockerfile optimizado para producción en Next.js
FROM node:20-alpine AS base

# Instalar dependencias
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Compilar la aplicación
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argumentos para variables públicas en el build de Next.js
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_BUSINESS_NAME
ARG NEXT_PUBLIC_BUSINESS_CITY
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_WHATSAPP_HUANCAYO
ARG NEXT_PUBLIC_YAPE_NUMBER
ARG NEXT_PUBLIC_YAPE_HOLDER

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_BUSINESS_NAME=$NEXT_PUBLIC_BUSINESS_NAME \
    NEXT_PUBLIC_BUSINESS_CITY=$NEXT_PUBLIC_BUSINESS_CITY \
    NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER \
    NEXT_PUBLIC_WHATSAPP_HUANCAYO=$NEXT_PUBLIC_WHATSAPP_HUANCAYO \
    NEXT_PUBLIC_YAPE_NUMBER=$NEXT_PUBLIC_YAPE_NUMBER \
    NEXT_PUBLIC_YAPE_HOLDER=$NEXT_PUBLIC_YAPE_HOLDER \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Imagen final para correr en producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
