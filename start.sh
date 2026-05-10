#!/usr/bin/env bash

echo "==================================="
echo "  HackJudge Local Deploy Script"
echo "==================================="

API_PORT=3001
WEB_PORT=3000

# Check deps
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm required. Run: npm install -g pnpm"; exit 1; }

# Load env if not set
if [ -z "$DATABASE_URL" ] && [ -f .env ]; then
  export DATABASE_URL=$(grep '^DATABASE_URL=' .env | sed 's/^DATABASE_URL=//' | sed 's/^["]//;s/["]$//')
fi

# Validate MongoDB Atlas URL
if [ -z "$DATABASE_URL" ] || [[ "$DATABASE_URL" != mongodb* ]]; then
  echo "❌ Set DATABASE_URL in .env to your MongoDB Atlas connection string"
  echo "   Get one free at: https://mongodb.com/atlas"
  exit 1
fi

# Detect LAN IP
LAN_IP=$(hostname -I | awk '{print $1}')
[ -z "$LAN_IP" ] && LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || echo "localhost")

echo "📡 LAN IP: $LAN_IP"
echo ""

# Install deps
echo "📦 Installing dependencies..."
pnpm install

# Generate Prisma client
echo "🔄 Generating Prisma client..."
cd packages/db && pnpm prisma generate && cd ../..

# Kill any existing processes on these ports first
fuser -k $WEB_PORT/tcp $API_PORT/tcp 2>/dev/null || true
sleep 1

# Start API (redirect stderr to avoid pnpm exit error noise)
echo "🔌 Starting API on 0.0.0.0:$API_PORT..."
HOST=0.0.0.0 pnpm --filter api dev 2>/dev/null &
API_PID=$!

# Start Web
echo "🌐 Starting Web on 0.0.0.0:$WEB_PORT..."
NEXT_PUBLIC_API_URL=http://$LAN_IP:$API_PORT/api/v1 pnpm --filter web dev:lan 2>/dev/null &
WEB_PID=$!

sleep 3

echo ""
echo "==================================="
echo "  ✅ HackJudge is running!"
echo "==================================="
echo ""
echo "  🌍 Web:      http://localhost:$WEB_PORT"
echo "  🔗 LAN:      http://$LAN_IP:$WEB_PORT"
echo "  🔌 API:      http://localhost:$API_PORT"
echo "  🗄️  DB:       MongoDB Atlas (cloud)"
echo ""
echo "  📱 Judges:   http://$LAN_IP:$WEB_PORT/events/{slug}/judge"
echo ""
echo "  🧪 Login:    organizer@hackjudge.dev / hackjudge-demo"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

cleanup() {
  echo ""
  echo "🛑 Stopping servers..."
  # Kill child processes by parent PID then port
  pkill -P $$ 2>/dev/null || true
  sleep 0.5
  fuser -k $WEB_PORT/tcp $API_PORT/tcp 2>/dev/null || true
  echo "   Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

wait
