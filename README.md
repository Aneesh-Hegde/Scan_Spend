# 📸 Scan Spend  
**An AI-powered expense tracker that extracts text from receipts and organizes your spending automatically.**  

## 🚀 Overview  
Scan Spend takes an image of a bill as input, extracts text using **Tesseract OCR**, and categorizes expenses for easy tracking. It provides a seamless way to manage finances without manual data entry.  

## 🛠 Tech Stack  
- **Backend:** Go  
- **Frontend:** Next.js (TypeScript)  
- **OCR Engine:** Tesseract (C++)  
- **Proxy:** Envoy  
- **Database:** PostgreSQL / Redis (for caching)  
- **gRPC:** For efficient service communication  
- **Containerization:** Docker  

## 📌 Features  
✔ Upload receipt images  
✔ Extract text using **Tesseract OCR** & **Gemini AI**  
✔ Store and manage expenses  
✔ Secure user authentication (JWT)  
✔ gRPC-based communication for efficiency  

## 🔧 Installation & Setup  

### Prerequisites  
Ensure you have the following installed:  
- **Docker**  
- **Go**  
- **Node.js** (for Next.js)  
- **Envoy Proxy**  
- **C++ & Tesseract OCR**  
  - Install Tesseract on Linux/macOS:  
    ```sh
    sudo apt install tesseract-ocr  # Ubuntu/Debian  
    brew install tesseract          # macOS  
    ```  
  - Install Tesseract on Windows:  
    [Download from here](https://github.com/tesseract-ocr/tesseract)  

### Steps  

1. **Clone the repository**  
   ```sh
   git clone https://github.com/yourusername/scan-spend.git
   cd scan-spend
   ```  

2. **Set up environment files**  

   - Create a `.env` file to be used when running Docker. Example:
     ```env
     # .env
     API_KEY=your_api_key
     JWT_SECRET_KEY=your_jwt_secret_key
     REDIS_ADDR="redis:{PORT}"
     REDIS_PASSWORD="redispassword"  # Keep same due to Docker set password
     ```

   - Create a `.env-dev` file for local development. Example:
     ```env
     # .env-dev
     API_KEY=your_api_key
     JWT_SECRET_KEY=your_jwt_secret_key
     REDIS_ADDR="localhost:{PORT}"
     REDIS_PASSWORD=""  # Local Redis password (leave empty for local development)
     ```

3. **Comment out the line that loads `.env-dev`**  
   When running the project in **Docker**, make sure you comment out the line in your Go project that loads the `.env-dev` file, as Docker will use the `.env` file for configuration.

   In your Go code, locate the line:

   ```go
   err := godotenv.Load(".env-dev")
   ```

   And comment it out like this:

   ```go
   // err := godotenv.Load(".env-dev")
   ```

   This ensures that the `.env` file is loaded properly when running the project in Docker.

4. **Run locally**  
   ```sh
   chmod +x run.sh
   ./run.sh
   ```  

5. **Run with Docker**  
   ```sh
   docker-compose up --build
   ```  

6. **Access the frontend**  
   Open `http://localhost:3000` in your browser.  

---

## 📂 Project Structure  

```
backend/          # Handles business logic, OCR processing, and database storage
  ├── data/       # File handling utilities
  ├── db/         # Database logic (PostgreSQL)
  ├── grpc/       # gRPC service definitions
  ├── redis/      # Redis caching setup
  ├── user_grpc/  # gRPC services for user authentication
  ├── utils/      # Utility functions (Auth, OCR, JWT, AI-based text extraction)
  ├── uploads/    # Stores uploaded receipt images
  ├── main.go     # Backend entry point
  ├── .env        # Environment file for Docker setup (loads during Docker run)
  ├── .env-dev    # Local development environment file

frontend/         # Next.js UI for tracking and managing expenses
  ├── app/        # Main application files
  ├── components/ # Reusable UI components
  ├── dashboard/  # Dashboard page
  ├── login/      # Login page
  ├── register/   # Register page
  ├── profile/    # User profile page
  ├── utils/      # API requests, gRPC clients, and authentication handling

grpc_schema/      # Stores .proto files for defining gRPC services

├── Dockerfile-envoy     # Envoy Docker setup
├── create_proto_file.sh # Script to generate gRPC files
├── envoy-dev.yaml       # Local Envoy configuration
├── envoy.yaml           # Docker Envoy configuration
├── docker-compose.yml   # Docker setup
├── run.sh               # Local run script
```

---

## 🏗 Architecture  
- **Go Backend:** Handles receipt processing, authentication, and business logic  
- **Next.js Frontend:** Provides an intuitive UI for expense tracking  
- **Tesseract (C++):** Extracts text from uploaded images  
- **Gemini AI:** Improves text recognition for better accuracy  
- **gRPC & Envoy:** Enables fast, efficient service communication  
- **Redis & PostgreSQL:** Stores expenses and caches data  
- **Docker:** Simplifies deployment and scalability  

---

## 🤝 Contributing  
Pull requests are welcome! Feel free to improve functionality or enhance documentation.  

### Steps to Contribute:  
1. **Fork the repository**  
2. **Create a feature branch**  
   ```sh
   git checkout -b feature-branch
   ```  
3. **Make changes & commit**  
   ```sh
   git commit -m "Add new feature"
   ```  
4. **Push & create a pull request**

   (Any readme contribution is appreciated😊)

---

## 📜 License  
MIT License  

---
