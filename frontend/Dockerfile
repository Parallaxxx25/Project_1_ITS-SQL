# Dev-mode container — runs the Vite dev server itself (not a production
# static build). This stack is for trying the full integration locally,
# not deploying; `pnpm build` + a static server is a separate concern.
#
# npm, not pnpm: pnpm 11's default supply-chain-policy gate on ignored
# lifecycle scripts exits non-zero in this non-interactive build even
# though the packages install fine — not worth fighting for a dev image.
# package-lock.json isn't committed here, so this resolves fresh each
# build rather than reproducing pnpm-lock.yaml's exact versions.
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
