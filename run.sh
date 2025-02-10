#!/bin/bash

# Start Go backend
echo "Starting Go backend..."
cd backend &&
  go run main.go &
sleep 5

# Start Next.js frontend
echo "Starting Next.js frontend..."
cd frontend &&
  npm run dev &
sleep 5

# Start Envoy proxy
echo "Starting Envoy..."
envoy -c envoy-dev.yaml &
sleep 5

# Wait for all background processes
wait
