#!/bin/sh
# Starts the API (internal port 8000) and the website (public $PORT) in one container. Preview use only.
set -e
export ENVIRONMENT="${ENVIRONMENT:-preview}"
export DATABASE_URL="${DATABASE_URL:-sqlite:///${DATA_DIR:-/data}/legalcore.db}"
export UPLOAD_DIR="${UPLOAD_DIR:-${DATA_DIR:-/data}/uploads}"
export COOKIE_SECURE="${COOKIE_SECURE:-true}"
if [ -z "$SECRET_KEY" ]; then
  # A fresh key on each start signs everyone out after a restart, which is fine for a preview.
  export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
fi
PORT="${PORT:-10000}"
APP_DIR="${APP_DIR:-/app}"

cd "$APP_DIR/backend"
alembic upgrade head
python -m app.seed --demo
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
API_PID=$!

cd "$APP_DIR/web"
API_URL=http://127.0.0.1:8000 HOSTNAME=0.0.0.0 PORT="$PORT" node server.js &
WEB_PID=$!

# Stop the container if either process exits, so the host restarts it.
while kill -0 "$API_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do sleep 5; done
exit 1
