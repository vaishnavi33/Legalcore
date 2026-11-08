# All-in-one image for a quick preview (for example a single Render "Web Service" using Docker).
# Runs the API and the website in one container. Uses SQLite unless DATABASE_URL is set.
# For production use docker-compose.yml (separate database, API and website) instead.

FROM node:22-slim AS web
WORKDIR /web
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
COPY --from=web /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY --from=web /web/.next/standalone/ web/
COPY start-preview.sh /app/start-preview.sh
RUN useradd --create-home --uid 10001 app && mkdir -p /data && chown -R app /data /app && chmod +x /app/start-preview.sh
USER app
EXPOSE 10000
CMD ["/app/start-preview.sh"]
