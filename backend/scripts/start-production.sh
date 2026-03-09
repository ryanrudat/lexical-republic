#!/bin/sh
set -e

echo "[Production] Resolving any failed migrations..."
npx prisma migrate resolve --rolled-back 20260308092844_consolidate_definition_field 2>/dev/null || true

echo "[Production] Running migrate deploy..."
npx prisma migrate deploy

echo "[Production] Running seed..."
npm run seed

echo "[Production] Starting server..."
node dist/index.js
