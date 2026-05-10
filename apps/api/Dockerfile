FROM node:20-alpine AS base
RUN npm install -g pnpm@9.0.0

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @hackjudge/api build
RUN pnpm --filter @hackjudge/db generate
RUN pnpm --filter @hackjudge/db migrate
RUN pnpm --filter @hackjudge/db seed

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
