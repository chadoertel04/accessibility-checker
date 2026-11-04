# Review API image. Build context is the repository root (or the app/ folder the
# backend deploy uploads, which has the same layout: package*.json, server/, init-db/).
#
# shortcut: installs the root package's runtime deps (React etc. included) because the
# server shares package.json with the frontend; split into an npm workspace if image size matters.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY server ./server
RUN npm run server:build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/server/dist ./server/dist
# db.ts applies ../../init-db/01-create-accessibility-reviews.sql relative to server/dist.
COPY init-db/01-create-accessibility-reviews.sql ./init-db/
USER node
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
