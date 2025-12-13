# 📸 Scan Spend  
**An AI-powered expense tracker that extracts text from receipts and organizes your spending automatically.**  

## 🚀 Overview  
Scan Spend takes an image of a bill as input, extracts text using **Tesseract OCR**, and categorizes expenses for easy tracking. It provides a seamless way to manage finances without manual data entry, with advanced features including **goals management**, **income tracking**, and **financial planning tools**.

## 🛠 Tech Stack  
- **Backend:** Go (with microservices architecture)
- **Frontend:** Next.js (TypeScript) with modern UI components
- **OCR Engine:** Tesseract (C++) + Gemini AI for enhanced text recognition
- **Proxy:** Envoy with advanced routing
- **Database:** PostgreSQL / Redis (for caching)
- **gRPC:** For efficient service communication
- **Containerization:** Docker with Docker Compose
- **Monitoring:** Prometheus + Grafana for observability
- **Orchestration:** Kubernetes support
- **Authentication:** JWT-based secure authentication

## 📌 Features  
### Core Features
✔ Upload receipt images  
✔ Extract text using **Tesseract OCR** & **Gemini AI**  
✔ Store and manage expenses  
✔ Secure user authentication (JWT)  
✔ gRPC-based communication for efficiency  

### New Advanced Features
✔ **Goals Management System** - Set, track, and achieve financial goals
✔ **Income Tracking** - Comprehensive income management with categorization
✔ **Balance Management** - Real-time balance tracking across multiple sources
✔ **Advanced Analytics** - Detailed financial insights and reporting
✔ **Calendar Integration** - Visual expense and income timeline
✔ **Bulk Operations** - Mass edit capabilities for income and expenses
✔ **Progress Tracking** - Visual progress indicators for financial goals
✔ **Modern UI Components** - Enhanced user experience with shadcn/ui components

### Monitoring & Observability
✔ **Prometheus Metrics** - Comprehensive service monitoring
✔ **Grafana Dashboards** - Real-time performance visualization
✔ **Service Health Checks** - Automated health monitoring
✔ **Performance Metrics** - Response time, throughput, and error tracking

## 🔧 Installation & Setup  

### Prerequisites  
Ensure you have the following installed:  
- **Docker**  
- **Go** (1.21+)  
- **Node.js** (18+) (for Next.js)  
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

7. **Access monitoring dashboards** (when running with Docker)
   - **Grafana:** http://localhost:3001 (admin/admin)
   - **Prometheus:** http://localhost:9090

---

## 📂 Project Structure  

```
backend/                    # Handles business logic, OCR processing, and database storage
  ├── api_gateway/         # API gateway service
  ├── balance/             # Balance management service
  ├── config/              # Configuration management
  ├── data/                # File handling utilities
  ├── db/                  # Database logic (PostgreSQL)
  ├── goals/               # Goals management service
  ├── grpc/                # gRPC service definitions
  ├── grpc_balance/        # Balance service gRPC definitions
  ├── grpc_goal/           # Goals service gRPC definitions
  ├── grpc_file/           # File service gRPC definitions
  ├── middleware/          # Middleware components
  ├── models/              # Data models
  ├── products/            # Product management service
  ├── redis/               # Redis caching setup
  ├── services/            # Microservices implementation
  ├── shared/              # Shared utilities and constants
  ├── states/              # State management
  ├── user_grpc/           # gRPC services for user authentication
  ├── utils/               # Utility functions (Auth, OCR, JWT, AI-based text extraction)
  ├── uploads/             # Stores uploaded receipt images
  ├── main.go              # Backend entry point
  ├── .env                 # Environment file for Docker setup (loads during Docker run)
  ├── .env-dev             # Local development environment file

frontend/                   # Next.js UI for tracking and managing expenses
  ├── app/                 # Main application files
  │   ├── components/      # Reusable UI components
  │   ├── dashboard/       # Dashboard page
  │   ├── goal/            # Goals management page
  │   ├── income/          # Income tracking page
  │   ├── calendar/        # Calendar view for expenses and income
  │   ├── balance/         # Balance management page
  │   ├── login/           # Login page
  │   ├── register/        # Register page
  │   ├── profile/         # User profile page
  │   ├── update/          # Update user information
  │   ├── summary/         # Financial summary and reports
  │   ├── verify-email/    # Email verification
  │   ├── hooks/           # Custom React hooks
  │   ├── services/        # API service layer
  │   ├── styles/          # Custom styles and themes
  │   ├── types/           # TypeScript type definitions
  │   ├── utils/           # Utility functions
  │   └── grpc_schema/     # gRPC client definitions
  ├── components/          # Global UI components (shadcn/ui)
  │   └── ui/              # Modern UI component library
  │       ├── button.tsx   # Button components
  │       ├── card.tsx     # Card components
  │       ├── dialog.tsx   # Modal dialogs
  │       ├── tabs.tsx     # Tabbed interfaces
  │       ├── progress.tsx # Progress indicators
  │       ├── chart.tsx    # Data visualization
  │       └── ...          # Additional UI components

grpc_schema/               # Stores .proto files for defining gRPC services
  ├── file.proto          # File service definitions
  ├── goal.proto          # Goals service definitions
  └── balance.proto       # Balance service definitions

k8s/                      # Kubernetes deployment configurations
  ├── envoy_deployment.yaml    # Envoy proxy deployment
  └── envoy_configmap.yaml     # Envoy configuration

monitoring/                # Monitoring and observability
  ├── prometheus.yml       # Prometheus metrics configuration
  ├── grafana.json         # Grafana dashboard configuration
  └── envoy-dev.yaml       # Local Envoy configuration

├── Dockerfile-envoy       # Envoy Docker setup
├── create_proto_file.sh   # Script to generate gRPC files
├── envoy-dev.yaml         # Local Envoy configuration
├── envoy.yaml             # Docker Envoy configuration
├── docker-compose.yml     # Docker setup with monitoring
├── run.sh                 # Local run script
```

---

## 🏗 Architecture  
- **Microservices Backend:** Go-based services for different domains (goals, balance, income, products, files)
- **Next.js Frontend:** Modern React-based UI with TypeScript for type safety
- **Tesseract (C++) + Gemini AI:** Advanced text extraction with AI enhancement
- **gRPC & Envoy:** High-performance service communication with intelligent routing
- **Redis & PostgreSQL:** Multi-layer data storage with caching for performance
- **Docker & Kubernetes:** Containerized deployment with orchestration support
- **Monitoring Stack:** Prometheus + Grafana for comprehensive observability
- **Modern UI:** shadcn/ui components for enhanced user experience

### Service Architecture
- **User Service:** Authentication and user management
- **Product Service:** Product and expense management
- **File Service:** File upload and processing
- **File Processing Service:** OCR and text extraction
- **Balance Service:** Financial balance tracking
- **Goals Service:** Financial goals and progress tracking
- **API Gateway:** Centralized request routing and authentication

---

## 📊 Monitoring & Observability

### Prometheus Metrics
The application exposes comprehensive metrics for monitoring:
- **Service Metrics:** Response times, request counts, error rates
- **Business Metrics:** File uploads, OCR processing, user activities
- **System Metrics:** Resource usage, database performance, cache hit rates

### Grafana Dashboards
Pre-configured dashboards provide:
- **Performance Overview:** Real-time service performance metrics
- **Business Intelligence:** User activity, file processing statistics
- **System Health:** Infrastructure and service health monitoring

### Health Checks
Automated health monitoring for all services with:
- **Liveness Probes:** Service availability checks
- **Readiness Probes:** Service readiness for traffic
- **Custom Metrics:** Business-specific health indicators

---

## 🚀 Deployment Options

### Local Development
```sh
./run.sh
```

### Docker Compose (Recommended for development)
```sh
docker-compose up --build
```

### Kubernetes (Production)
```sh
kubectl apply -f k8s/
```

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
