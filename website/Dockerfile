# Build from repository root: docker build -f website/Dockerfile .
FROM node:24.15.0-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci --include=dev
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_GTM_ID
ARG VITE_WEBSITE_APPCHECK_SITE_KEY
ARG VITE_CONSUMER_APP_URL
RUN npm run build:next --workspace catch-marketing

FROM node:24.15.0-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV CATCH_WEBSITE_STAGE=preview
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /app/website/.next/standalone ./
COPY --from=build --chown=node:node /app/website/.next/static ./website/.next/static
COPY --from=build --chown=node:node /app/website/public ./website/public
COPY --from=build --chown=node:node /app/website/.next-legacy ./website/public/_legacy
USER node
WORKDIR /app/website
EXPOSE 8080
CMD ["node", "server.js"]
