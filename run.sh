#!/bin/bash

# Start Go backend
echo "Starting Go backend..."
cd backend &&
  go run main.go &

# Start Next.js frontend
echo "Starting Next.js frontend..."
cd frontend &&
  npm run dev &

# Start Envoy proxy
echo "Starting Envoy..."
envoy -c envoy-dev.yaml &

# Wait for all background processes
wait
