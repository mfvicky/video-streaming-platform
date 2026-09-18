# video-streaming-platform

A scalable, full-stack video processing pipeline built with Node.js, Express, React, TypeScript, and a microservice background worker architecture.

## 🚀 Architecture Overview

- **Frontend (`apps/web`)**: React, TypeScript, Vite
- **Backend API (`apps/api`)**: Express, REST API, Swagger/OpenAPI, Pino, Zod
- **Worker (`apps/worker`)**: Node.js microservice consuming RabbitMQ queues, running FFmpeg tasks
- **Shared (`packages/shared`)**: Shared Zod schemas, TypeScript types, and constants
- **Database (`packages/db`)**: PostgreSQL managed via Prisma ORM
- **Queue**: RabbitMQ for asynchronous job scheduling
- **Cache & Progress**: Redis for job status tracking and caching
- **Object Storage**: MinIO (S3-compatible) for raw and processed video uploads

---

## 🛠️ Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: `>= 20.x`
- **pnpm**: `>= 9.x` (`npm i -g pnpm`)
- **Docker & Docker Compose**: For local infrastructure
- **FFmpeg**: Required for running the worker locally (`brew install ffmpeg` / `sudo apt install ffmpeg`)

---

## 🏁 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone [https://github.com/your-username/video-platform.git](https://github.com/your-username/video-platform.git)
cd video-platform
pnpm install
```
