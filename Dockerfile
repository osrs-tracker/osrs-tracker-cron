FROM node:10-alpine as builder
WORKDIR /usr/src/app/
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run lint
RUN npm run build:ci

FROM node:10-alpine
WORKDIR /usr/app/
COPY --from=builder /usr/src/app/dist/ ./
HEALTHCHECK  --interval=1m --timeout=2s \
  CMD wget --quiet --tries=1 --spider http://localhost:8080 || exit 1
CMD [ "node", "osrs-tracker-cron.js" ]
