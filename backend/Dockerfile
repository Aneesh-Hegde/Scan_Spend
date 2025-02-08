
FROM golang:1.23 AS builder

# Install dependencies for Tesseract-OCR
RUN apt-get update && apt-get install -y \
  tesseract-ocr \
  libleptonica-dev \
  libtesseract-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod tidy

COPY . .
RUN go build -o main .

FROM debian:latest

# Install runtime dependencies for Tesseract
RUN apt-get update && apt-get install -y \
  tesseract-ocr \
  libleptonica-dev \
  libtesseract-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /root/
COPY --from=builder /app/main .
COPY ./db/tables.sql ./db/tables.sql
EXPOSE 8081
CMD ["./main"]

