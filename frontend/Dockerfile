# Four stages:
#   dev         — runs the Vite dev server itself, for the local trial stack
#                 in docker-compose.yml (which pins `target: dev`).
#   build       — `vite build` into /app/dist.
#   caddy-build — Caddy compiled with the Cloudflare DNS plugin.
#   prod        — that Caddy serving dist and proxying /api, for
#                 docker-compose.prod.yml. See DEPLOY_VM.md.
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


# The domain points at a campus-private IP, so Let's Encrypt cannot reach
# port 80 for HTTP-01. Certificates come from DNS-01 through Cloudflare's
# API instead, which stock Caddy has no module for.
FROM caddy:2-builder AS caddy-build

RUN xcaddy build --with github.com/caddy-dns/cloudflare


FROM caddy:2-alpine AS prod

COPY --from=caddy-build /usr/bin/caddy /usr/bin/caddy
COPY --from=build /app/dist /srv
