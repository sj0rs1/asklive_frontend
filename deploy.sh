#!/bin/bash
set -e
cd ~/asklive_frontend

docker build -t asklive-frontend .
docker rm -f asklive_frontend 2>/dev/null || true
docker run -d --name asklive_frontend \
  --network asklive_network \
  --restart unless-stopped \
  -p 80:80 \
  asklive-frontend
docker image prune -f