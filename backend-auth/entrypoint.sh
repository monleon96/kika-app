#!/bin/sh
set -e

echo "🚀 Running database migrations..."
alembic upgrade head

echo "✅ Migrations completed!"
echo "🌐 Starting application..."
exec uvicorn app:app --host 0.0.0.0 --port 80
