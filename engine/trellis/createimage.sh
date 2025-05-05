#!/bin/bash

# Fail fast on errors
set -e

IMAGE_NAME="lucasdino/trellis"
TAG="latest"

echo "[*] Building Docker image..."
docker build -t $IMAGE_NAME:$TAG .

echo "[*] Logging into Docker Hub..."
docker login

echo "[*] Pushing image to Docker Hub..."
docker push $IMAGE_NAME:$TAG

echo "[*] Removing local image..."
docker rmi $IMAGE_NAME:$TAG

echo "[✔] Done. Pushed $IMAGE_NAME:$TAG to Docker Hub and removed local image."