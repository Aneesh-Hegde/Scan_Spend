#!/bin/bash

PROTO_SRC="./grpc_schema"
GO_OUTPUT_DIR="./backend"
JS_OUTPUT_DIR="./frontend/src/app/grpc_schema"

mkdir -p "$GO_OUTPUT_DIR"
mkdir -p "$JS_OUTPUT_DIR"

echo "🛠 Generating Go protobuf files..."
protoc -I"$PROTO_SRC" --go_out="$GO_OUTPUT_DIR" --go-grpc_out="$GO_OUTPUT_DIR" "$PROTO_SRC"/*.proto
echo "✅ Go protobuf files generated in $GO_OUTPUT_DIR"

echo "🛠 Generating JavaScript & gRPC-Web protobuf files..."
protoc -I="$PROTO_SRC" \
  --js_out=import_style=commonjs:"$JS_OUTPUT_DIR" \
  --grpc-web_out=import_style=typescript,mode=grpcwebtext:"$JS_OUTPUT_DIR" \
  "$PROTO_SRC"/*.proto
echo "✅ JavaScript & gRPC-Web protobuf files generated in $JS_OUTPUT_DIR"

echo "🚀 All protobuf files successfully generated!"
