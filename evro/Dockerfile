# Athens EVRO — single-container image for Cloud Run (or any container host).
# Builds the Vite frontend, then runs the Express server which serves BOTH the
# built SPA and /api from one origin. Build context is this `evro/` directory:
#     cd evro && gcloud run deploy athens-evro --source .
#
# The runtime layout mirrors the repo so the server's relative paths resolve:
#   server/src/index.js -> ../../frontend/dist   (static SPA)
#   server/db/migrate.js -> ../../data/seed.json  (seed on boot)
# i.e. /app/{server,frontend,data} are siblings, exactly as in the repo.

# ---- stage 1: build the frontend -------------------------------------------
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
# --include=dev: Vite is a devDependency and is needed to build.
RUN npm ci --include=dev
COPY frontend/ ./
RUN npm run build

# ---- stage 2: runtime ------------------------------------------------------
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY data/ /app/data/
COPY --from=frontend /app/frontend/dist /app/frontend/dist
# Cloud Run injects PORT=8080; index.js reads process.env.PORT.
EXPOSE 8080
CMD ["node", "src/index.js"]
