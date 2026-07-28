FROM node:24-alpine AS base

# Stage 1
FROM base AS builder

WORKDIR /home/build

COPY package*.json .
COPY tsconfig.json .
COPY next.config* .
COPY postcss.config* .

RUN npm install

COPY app/ app/
COPY public/ public/

# Sentry's entry points. Next discovers instrumentation.ts / instrumentation-client.ts
# by filename at the project root — omit them and the build still succeeds while the
# SDK silently never initializes, which is exactly how this went unnoticed.
COPY instrumentation.ts instrumentation-client.ts ./
COPY sentry.server.config.ts sentry.edge.config.ts ./

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build


# Stage 2
FROM base AS runner

WORKDIR /home/app

COPY --from=builder /home/build/.next/standalone .
COPY --from=builder /home/build/.next/static .next/static/
COPY --from=builder /home/build/public public/

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

CMD ["node","server.js"]

