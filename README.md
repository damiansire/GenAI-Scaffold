⚠️ (WORK IN PROGRESS) Not for production use.

🚧 (DRAFT) This repository is currently under construction.

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
- **Docker** and **Docker Compose**

---

### Installation and Configuration

Clone the repository:

```bash
git clone https://github.com/damiansire/GenAI-Scaffold.git
cd GenAI-Scaffold
```

Create your environment file by copying the example:

```bash
cp .env.example .env
```

Edit `.env` and add your Google Gemini API key:

```
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

Install dependencies (npm Workspaces will handle both frontend and backend):

```bash
npm install
```

### Running the Application

To start both servers (frontend and backend) in development mode with hot reload:

```bash
npm run dev
```

- **Angular frontend**: http://localhost:4200
- **Node.js backend**: http://localhost:3000

---

## 🗂️ Project Structure

Optimized for scalability and clarity:

```
/GenAI-Scaffold/
├── packages/
│   ├── client/   (Angular Application)
│   │   ├── src/app/
│   │   │   ├── core/       # Singleton services, interceptors, guards
│   │   │   ├── features/   # Functional modules (e.g., 'prompt')
│   │   │   └── shared/     # Reusable UI components, pipes, directives
│   └── server/   (Node.js API)
│       ├── src/
│       │   ├── api/        # Routes and controllers
│       │   ├── config/     # Configuration files (CORS, etc.)
│       │   └── services/   # Business logic and external API communication
├── .docker/                # Dockerfiles for production
├── .env                    # Environment variables (gitignored)
└── docker-compose.yml      # Container orchestration for production
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

## 🐳 Production Deployment with Docker

The project is fully containerized and ready for production deployment.

- **Multi-stage Builds**: Each Dockerfile separates build and runtime environments for smaller, secure images.
- **Nginx for Frontend**: The built Angular app is served via an optimized Nginx container for SPA delivery.
- **Single Command Orchestration**: The `docker-compose.yml` file spins up the full production stack easily.

To build and run production containers:

```bash
docker-compose up --build
```

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome!  
Feel free to open a pull request or issue if you'd like to help enhance this blueprint.
