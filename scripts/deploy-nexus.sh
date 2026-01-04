#!/bin/bash
set -e

echo "=========================================="
echo "Nexus Deployment Started"
echo "Time: $(date)"
echo "=========================================="

cd /home/nexus/htdocs/nexus.simoncallaghan.dev/nexus

# Check for .env.nexus configuration
if [ ! -f .env.nexus ]; then
    echo "WARNING: .env.nexus not found!"
    echo "Please copy .env.nexus.example to .env.nexus and configure it."
    echo "Using defaults for now..."
fi

FIRST_DEPLOY=false
if [ ! -f .deployed ]; then
    FIRST_DEPLOY=true
    echo "First deployment detected"
fi

echo "Pulling latest code..."
git fetch origin main
git checkout main
git pull origin main

echo "Cleaning up stale containers..."
docker compose down --remove-orphans 2>/dev/null || true
# Force remove any stale containers that might be holding ports
docker ps -a --filter "name=nexus-app" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "name=nexus-redis" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true

# Find and kill any container using port 3011
echo "Checking for containers using port 3011..."
for cid in $(docker ps --format '{{.ID}}' 2>/dev/null); do
    ports=$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{$p}}{{end}}' "$cid" 2>/dev/null || echo "")
    if echo "$ports" | grep -q "3011"; then
        echo "Found container $cid using port 3011, removing..."
        docker rm -f "$cid" 2>/dev/null || true
    fi
done

# Kill any process using port 3011 (non-Docker)
echo "Checking for processes using port 3011..."
if command -v lsof >/dev/null 2>&1; then
    lsof -ti:3011 | xargs -r kill -9 2>/dev/null || true
elif command -v fuser >/dev/null 2>&1; then
    fuser -k 3011/tcp 2>/dev/null || true
fi

# Prune any dangling networks that might be blocking
docker network prune -f 2>/dev/null || true

echo "Logging into GitHub Container Registry..."
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$USERNAME" --password-stdin 2>/dev/null || true

echo "Pulling latest image from GHCR..."
docker pull ghcr.io/simonjackson24/nexus:latest || {
    echo "Failed to pull image, will build locally..."
}

echo "Starting services..."
docker compose -f docker-compose.override.yml up -d --remove-orphans

echo "Waiting for healthy..."
sleep 30

HEALTH=$(curl -s http://localhost:3011/api/health || echo "failed")
if echo "$HEALTH" | grep -q "ok"; then
    echo "Deployment successful!"
    echo "Health check: $HEALTH"
    touch .deployed
else
    echo "Health check: $HEALTH"
    docker compose logs --tail=50 nexus
    sleep 20
    HEALTH2=$(curl -s http://localhost:3011/api/health || echo "failed")
    if echo "$HEALTH2" | grep -q "ok"; then
        echo "Deployment successful on retry!"
        echo "Health check: $HEALTH2"
        touch .deployed
    else
        echo "Health check failed"
        docker compose logs --tail=30 nexus
        exit 1
    fi
fi

echo "Cleaning up..."
docker image prune -f 2>/dev/null || true

echo "Logging..."
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
echo "$(date +%Y-%m-%d-%H-%M-%S) - $COMMIT_SHA" >> deployment.log

echo "=========================================="
echo "Deployment completed"
echo "=========================================="
