⚠️ (WORK IN PROGRESS) Not for production use.

🚧 (DRAFT) This repository is currently under construction.

### ⚠️ Important Disclaimer

> The last time I did this... I got 400 followers on GitHub and an endless number of emails from frustrated developers because their PMs / TLs / Coworkers were forcing them to follow some of my architecture/development practices or asking things like, "What should my developers do in this case?".
>
> So, I feel obligated to add this:
>
> **Do not force your developers to do things the way they are done in this repo, nor use it to tell them how to do things. Always remember:**
>
> - **Ugly code that works** = you move fast, validate, and generate revenue.
> - **Beautiful code without use** = long code review time, you feel proud, but the business dies.
> - **Beautiful code that works** = rare, it usually comes after success, not before.

# 🚀 Full-Stack Multimodal AI Application: A Production Blueprint

This repository serves as a **production-ready blueprint** for building modern, scalable, and high-performance web applications using a cutting-edge tech stack: **Angular** for the frontend, **Node.js** for the backend, and **Google Gemini API** for multimodal AI capabilities.

The project is built from the ground up following strict industry best practices for **TypeScript full-stack development**, focusing on **maintainability**, **developer experience**, and **deployment readiness**.

---

# 🤔 Why Not Microservices?

This project intentionally avoids a microservices architecture. While microservices can offer benefits in extremely large, distributed systems, they also introduce significant complexity in deployment, observability, and inter-service communication.

For this application, a **modular monolithic architecture** provides a better balance of **maintainability, performance, and simplicity**, especially in early or medium-scale production environments. It allows independent development and testing of the frontend and backend within a single monorepo, without the overhead of managing multiple networked services.

**Moreover, if you ever reach a point where migrating to a microservices architecture becomes necessary, you'll likely already have the technical maturity and understanding required to refactor this system into microservices.**

---

## 🧱 Core Architectural Principles

The architecture is designed around several key principles to ensure robustness and scalability:

### 🧩 Monorepo with npm Workspaces

Frontend and backend coexist in a single repository but are managed as independent packages. This simplifies dependency management and scripting while maintaining a clear separation of concerns.

### 🔗 Decoupled Architecture

The Angular client and Node.js server are completely independent applications communicating through a well-defined RESTful API. Each can be developed, tested, and deployed autonomously.

### 🧠 Layered Backend

The Node.js API follows a layered structure (**Routes → Controllers → Services**), cleanly separating HTTP request handling from business logic. This improves organization, testability, and reasoning about the codebase.

### ⚙️ Feature-Oriented Frontend

The Angular app abandons NgModules in favor of a **100% Standalone Component architecture**. The folder structure is organized by **features**, not file type, grouping related code together for better modularity.

---

## 🧰 Tech Stack Overview

| Area           | Technology         | Description                                                                                                                                                |
| -------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**   | **Angular 20+**    | Modern framework for building UIs using Standalone Components, Signals for state management, and `ChangeDetectionStrategy.OnPush` for optimal performance. |
| **Backend**    | **Node.js**        | JavaScript runtime environment for the server side.                                                                                                        |
|                | **Express.js**     | Minimalist framework for building RESTful APIs.                                                                                                            |
|                | **Multer**         | Middleware for handling file uploads (multipart/form-data).                                                                                                |
| **AI**         | **Google Gemini**  | API for multimodal (text and image) content generation.                                                                                                    |
| **Language**   | **TypeScript**     | Used end-to-end for strict typing and better developer experience.                                                                                         |
| **Deployment** | **Docker & Nginx** | Containerization for consistent and isolated deployments. Nginx serves the production Angular app as a high-performance web server.                        |

---

## ⚡ Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

Make sure you have the following installed:

- **Node.js** (v18 or higher) and **npm**
- **Angular CLI** (`npm install -g @angular/cli`)
- **Docker** and **Docker Compose** (optional)

---

### Installation and Configuration

Clone the repository:

```bash
git clone https://github.com/damiansire/GenAI-Scaffold.git
cd GenAI-Scaffold
```

Create your environment file by copying the example:

```bash
cp env.example .env
```

Edit `.env` and add your Google Gemini API key:

```
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

**Get your Gemini API key here:** https://aistudio.google.com/app/apikey

> **Note:** The Gemini API key is required for the **Image Generation (Nano Banana)** feature. Without it, you can still use the Text Generation and Image OCR features in demo mode.

Install dependencies (npm Workspaces will handle both frontend and backend):

```bash
npm install
```

### Running the Application

#### Option 1: Development Mode (Recommended for development)

```bash
npm run dev
```

- **Angular frontend**: http://localhost:4200
- **Node.js backend**: http://localhost:3000

#### Option 2: Docker Mode (Recommended for production/testing)

```bash
# Start Docker Desktop first (macOS)
open -a Docker

# Build and run with Docker
docker compose up --build -d

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

- **Angular frontend**: http://localhost:8080
- **Node.js backend**: http://localhost:3000

**Health Checks:**

```bash
curl http://localhost:3000/health  # API
curl http://localhost:8080/health  # Frontend
```

> **Troubleshooting Docker:** If you encounter build errors, check the [Deployment Guide troubleshooting section](docs/DEPLOYMENT.md#-solución-de-problemas-de-docker)

---

## 🌟 AI Features

This platform includes three powerful AI capabilities powered by Google's models:

### 📝 Text Generation (Google Text Bison)

- Generate creative and contextual text from prompts
- Configurable parameters: max tokens, temperature, top-p, top-k
- Real-time streaming responses
- Token usage tracking

### 🔍 Image OCR (Google Vision OCR)

- Extract text from images with high accuracy
- Multi-language support (10+ languages)
- Bounding box detection for text positioning
- Confidence scores for each annotation
- Supports JPEG, PNG, GIF, WEBP, BMP formats

### 🎨 Image Generation - Nano Banana (Gemini 2.5 Flash Image)

**NEW!** Generate and edit images using Gemini's native image generation:

**Modes:**

- **Text-to-Image**: Create images from descriptive prompts
- **Image Editing**: Modify existing images with text instructions
- **Style Transfer**: Apply artistic styles to photos
- **Multi-Image Composition**: Combine elements from multiple images
- **Iterative Refinement**: Conversational image editing

**Capabilities:**

- 10 aspect ratios (Square, Portrait, Landscape, Widescreen, etc.)
- High-fidelity text rendering in images (logos, diagrams, posters)
- Photorealistic rendering with advanced lighting and camera controls
- Illustration and sticker generation
- Product mockups and commercial photography
- Sequential art (comic panels, storyboards)

**Prompting Best Practices:**

- Describe scenes narratively, not just keywords
- Use photography terms for realism (lens type, lighting, camera angle)
- Be hyper-specific about details
- Iterate conversationally for refinement
- Use step-by-step instructions for complex scenes

**Note:** All generated images include a SynthID watermark.

---

## 🗂️ Project Structure

Optimized for scalability and clarity:

```
/GenAI-Scaffold/
├── packages/               # Monorepo packages
│   ├── client/            # Angular Application
│   │   ├── src/app/
│   │   │   ├── core/       # Singleton services, interceptors
│   │   │   └── features/   # Functional components (text-model, image-model)
│   │   └── package.json
│   └── api/               # Node.js API
│       ├── src/
│       │   ├── api/        # Routes, controllers, middleware
│       │   ├── core/       # Base classes (ApiError)
│       │   ├── models/     # Factory, Registry, Loader
│       │   └── plugins/    # AI model strategies
│       └── package.json
├── .docker/               # Dockerfiles for production
│   ├── Dockerfile.client  # Angular + Nginx
│   ├── Dockerfile.server  # Node.js API
│   └── nginx.conf         # Nginx configuration
├── docs/                  # Documentation
│   ├── API.md             # API documentation
│   ├── DEVELOPMENT.md     # Development guide
│   ├── DEPLOYMENT.md      # Deployment guide
│   └── TROUBLESHOOTING.md # Problem solving guide
├── package.json           # Workspace configuration
├── package-lock.json      # Dependency lock file
├── .env.example           # Environment variables template
└── docker-compose.yml     # Container orchestration
```

---

## ✅ Best Practices Implemented

### Backend (Node.js)

- **Secure API Key Handling**: All secrets are managed via environment variables — never hardcoded.
- **File Uploads**: `multer` configured per route to efficiently and securely handle multipart/form-data.
- **Strict CORS Policy**: Only trusted origins are allowed in production.

### Frontend (Angular)

- **100% Standalone Components**: No NgModules — less boilerplate, simpler dependency management.
- **Reactive State with Signals**: Uses `signal()` and `computed()` for high-performance state management.
- **OnPush Change Detection**: Minimizes unnecessary re-rendering.
- **Lazy Loading with `loadComponent`**: Reduces initial bundle size and improves performance.
- **Modern Dependency Injection**: Uses `inject()` instead of constructor injection.
- **Functional Interceptors**: Uses `withInterceptors()` for a more composable HTTP pipeline.
- **Native Control Flow**: Leverages new `@if` and `@for` syntax for cleaner, faster templates.

---

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[API Documentation](docs/API.md)** - Complete API reference with examples
- **[Development Guide](docs/DEVELOPMENT.md)** - Setup and development workflow
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common problems and solutions

## 🐳 Production Deployment with Docker

The project is fully containerized and ready for production deployment.

- **Multi-stage Builds**: Each Dockerfile separates build and runtime environments for smaller, secure images.
- **Workspace Support**: Dockerfiles are configured for npm workspaces (monorepo architecture)
- **Nginx for Frontend**: The built Angular app is served via an optimized Nginx container for SPA delivery.
- **Health Checks**: Both services include health check endpoints for monitoring
- **Single Command Orchestration**: The `docker-compose.yml` file spins up the full production stack easily.

To build and run production containers:

```bash
# Start Docker Desktop first (macOS)
open -a Docker

# Build and run all services
docker compose build
docker compose up -d

# Check status (both services should be healthy)
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Useful Commands:**

```bash
# Rebuild without cache
docker compose build --no-cache

# Build specific service
docker compose build api
docker compose build client

# View service logs
docker compose logs -f api
docker compose logs -f client

# Execute commands in running container
docker compose exec api sh
docker compose exec client sh
```

**Architecture Notes:**

- The API service uses a multi-stage build with TypeScript compilation
- Dependencies are installed using `npm ci --workspace` for monorepo support
- Production TypeScript configuration relaxes strictness for deployment
- Nginx serves the Angular app with SPA routing support and compression

For detailed deployment instructions and troubleshooting, see the **[Deployment Guide](docs/DEPLOYMENT.md)**

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome!  
Feel free to open a pull request or issue if you'd like to help enhance this blueprint.
