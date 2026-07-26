FROM node:24-alpine AS base


# Stage 1
FROM base AS builder

WORKDIR /home/build

COPY package*.json .
COPY tsconfig.json .

RUN npm install

COPY src/ src/

RUN npm run build



# Stage 2
FROM base AS runner

WORKDIR /home/app

COPY --from=builder /home/build/dist dist/
COPY --from=builder /home/build/package*.json .
COPY --from=builder /home/build/src/db dist/db/

# Preset avatars + static files. Without this, listPresets() ENOENTs in prod.
COPY public/ public/

RUN npm install --omit=dev

CMD ["npm","start"]

