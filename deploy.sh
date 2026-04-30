#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

# Configuration
APP_NAME="papi-webapp-frontend"
BRANCH="main"

echo "Starting deployment for $APP_NAME..."

# Pull the latest changes
echo "Fetching updates from GitHub ($BRANCH)..."
git fetch origin $BRANCH
git reset --hard origin/$BRANCH

# Stop and remove the old container
echo "Stopping existing container..."
docker compose down

# Rebuild and restart
echo "Rebuilding image and starting services..."
docker compose up -d --build

# Cleanup
echo "Cleaning up dangling images..."
docker image prune -f

echo "Deployment completed successfully."
