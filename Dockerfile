FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js inlines NEXT_PUBLIC_* env vars into the client JS bundle at
# BUILD time — they have to be present here, not at Cloud Run runtime.
# Each var: declare an ARG (passed via --build-arg from cloudbuild.yaml),
# then promote it to ENV so `npm run build` picks it up.
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

ARG NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=""
ENV NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=$NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

# Media CDN base URL — empty disables the CDN (images served straight from GCS).
ARG NEXT_PUBLIC_CDN_URL=""
ENV NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL

# App-asset CDN (assetPrefix): serves _next/static (JS/CSS/chunks) from a
# CDN host. Must be set at BUILD time (Next inlines it into emitted asset URLs).
# Empty → assets served from the app origin (safe default).
ARG ASSET_PREFIX=""
ENV ASSET_PREFIX=$ASSET_PREFIX

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
