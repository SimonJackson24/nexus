# ============================================
# Nexus - Multi-Provider AI Chat Platform
# Production Dockerfile
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# ============================================
# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy all config files first
COPY next.config.mjs .
COPY package.json .
COPY postcss.config.mjs .
COPY tailwind.config.ts .
COPY tsconfig.json .
COPY scripts/ ./scripts/

# Copy source and public
COPY public ./public
COPY src ./src

# Generate build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================
# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder first
COPY --from=builder /app/public ./public
# Copy standalone output
COPY --from=builder /app/.next/standalone ./
# Copy static files
COPY --from=builder /app/.next/static ./.next/static
# Copy entrypoint script
COPY --from=builder /app/scripts/entrypoint.sh /entrypoint.sh
# Fix line endings and set permissions BEFORE chown to /app
RUN chmod 755 /entrypoint.sh && apk add --no-cache dos2unix && dos2unix /entrypoint.sh 2>/dev/null || true && rm -f $(which dos2unix) 2>/dev/null || true

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXUS_CONFIG_PATH=/app/.env.nexus

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application with entrypoint
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
