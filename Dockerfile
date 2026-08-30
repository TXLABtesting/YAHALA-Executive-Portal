# Builds the frontend, then serves it together with the API from one process.

FROM node:22-alpine AS web-build
WORKDIR /build
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/
# The seed script reads the merchant data that ships in assets/.
COPY assets/ ./assets/
COPY --from=web-build /build/dist ./web/dist

RUN mkdir -p /app/server/uploads
VOLUME ["/app/server/uploads"]

EXPOSE 4000
WORKDIR /app/server

# Migrate and seed on boot; seeding is skipped once the database has merchants.
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/seed.js && node src/index.js"]
