#!/bin/bash

# Define service directories relative to the project root
SERVICES_BASE_PATH="backend/services"
FRONTEND_PATH="frontend"
ENVOY_CONFIG="envoy-dev.yaml" # Assuming this is also at project root

# Start Go microservices
echo "Starting Go microservices..."
(cd "$SERVICES_BASE_PATH/user" && go run .) &
(cd "$SERVICES_BASE_PATH/balance" && go run .) &
(cd "$SERVICES_BASE_PATH/file" && go run .) &
(cd "$SERVICES_BASE_PATH/goals" && go run .) &
(cd "$SERVICES_BASE_PATH/product" && go run .) &
sleep 10 # Give services time to start

# Start Next.js frontend
echo "Starting Next.js frontend..."
(cd "$FRONTEND_PATH" && npm run dev) &
sleep 8

# Start Envoy proxy
echo "Starting Envoy..."
envoy -c "$ENVOY_CONFIG" &
sleep 5

echo "All components launching. Press Ctrl+C to stop this script."

# Wait for all background processes launched by this script to finish
wait

echo "Script finished."
