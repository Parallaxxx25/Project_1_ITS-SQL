# Three stages:
#   dev   — runs the Vite dev server itself, for the local trial stack in
#           docker-compose.yml (which pins `target: dev`).
#   build — `vite build` into /app/dist.
#   prod  — Caddy serving that dist and proxying /api, for
#           docker-compose.prod.yml. See DEPLOY_VM.md.
#
# npm, not pnpm: pnpm 11's default supply-chain-policy gate on ignored
# lifecycle scripts exits non-zero in this non-interactive build even
# though the packages install fine — not worth fighting for a dev image.
# package-lock.json isn't committed here, so this resolves fresh each
# build rather than reproducing pnpm-lock.yaml's exact versions.
FROM node:22-alpine AS dev

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]


# VITE_API_URL deliberately unset: lib/api.js falls back to '/api', which is
# right for a same-origin deploy behind Caddy.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build


FROM caddy:2-alpine AS prod

COPY --from=build /app/dist /srv
