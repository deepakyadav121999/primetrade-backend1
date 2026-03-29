# ⬡ Primetrade Task Manager — Backend Internship Assignment

> **Scalable REST API with JWT Authentication & Role-Based Access Control**  
> Built with **Next.js 14** · **Tailwind CSS** · **MySQL 8** · **TypeScript** · **Swagger/OpenAPI 3**

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Quick Start — Local](#quick-start--local)
4. [Quick Start — Docker](#quick-start--docker)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Security Practices](#security-practices)
8. [Frontend Pages](#frontend-pages)
9. [Scalability Notes](#scalability-notes)

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack — API routes + React UI |
| Language | TypeScript | Type safety across front and back |
| Styling | Tailwind CSS | Utility-first styling for all UI pages |
| Database | MySQL 8 via `mysql2` | Relational data with a connection pool |
| Auth | `jsonwebtoken` + `bcryptjs` | Stateless JWT, bcrypt password hashing |
| Validation | Zod | Schema-first input validation |
| API Docs | Swagger UI React + OpenAPI 3 | Interactive documentation at `/api-docs` |
| Containers | Docker + Docker Compose | One-command local + production setup |

---

## Project Structure

```
primetrade-backend/
├── scripts/
│   └── schema.sql              # MySQL DDL — run once to initialise DB
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/             # All API endpoints under /api/v1
│   │   │       ├── auth/
│   │   │       │   ├── register/route.ts   # POST — create account
│   │   │       │   └── login/route.ts      # POST — get JWT
│   │   │       ├── users/
│   │   │       │   └── me/route.ts         # GET  — own profile
│   │   │       ├── tasks/
│   │   │       │   ├── route.ts            # GET (list) + POST (create)
│   │   │       │   └── [id]/route.ts       # GET + PUT + DELETE
│   │   │       ├── admin/
│   │   │       │   ├── users/route.ts      # GET — all users (admin)
│   │   │       │   └── tasks/route.ts      # GET — all tasks (admin)
│   │   │       └── docs/route.ts           # GET — OpenAPI 3 JSON spec
│   │   ├── login/page.tsx       # Login UI (Tailwind)
│   │   ├── register/page.tsx    # Register UI (Tailwind)
│   │   ├── dashboard/page.tsx   # Kanban board + admin panel (Tailwind)
│   │   ├── api-docs/page.tsx    # Swagger UI page
│   │   ├── globals.css          # @tailwind directives + shared utilities
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── db.ts                # MySQL connection pool singleton
│   │   ├── jwt.ts               # signToken / verifyToken helpers
│   │   └── response.ts          # Typed API response helpers (ok, created, error…)
│   ├── middleware/
│   │   └── auth.ts              # withAuth() HOF — JWT guard + RBAC
│   └── types/
│       └── schemas.ts           # Zod validation schemas for all inputs
├── .env.example
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── tsconfig.json
├── Dockerfile
└── docker-compose.yml
```

---

## Quick Start — Local

### Prerequisites
- Node.js ≥ 18
- MySQL 8 running locally

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/primetrade-backend.git
cd primetrade-backend

# 2. Install dependencies (includes Tailwind CSS)
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env — set DB_PASSWORD, DB_NAME, and JWT_SECRET

# 4. Create the database and tables
mysql -u root -p < scripts/schema.sql

# 5. Start the development server
npm run dev
```

**App is running at [http://localhost:3000](http://localhost:3000)**

| URL | Description |
|---|---|
| `http://localhost:3000/login` | Login page |
| `http://localhost:3000/register` | Register page |
| `http://localhost:3000/dashboard` | Kanban dashboard (JWT required) |
| `http://localhost:3000/api-docs` | Swagger UI — interactive API docs |
| `http://localhost:3000/api/v1/docs` | Raw OpenAPI 3 JSON spec |

---

## Quick Start — Docker

```bash
# 1. Copy and fill in environment variables
cp .env.example .env
# Set: DB_PASSWORD, DB_NAME=primetrade_db, JWT_SECRET (min 32 chars)

# 2. Build and start both MySQL + Next.js
docker compose up --build

# App → http://localhost:3000
# MySQL auto-initialises from scripts/schema.sql on first boot
```

MySQL data is persisted in a named Docker volume (`mysql_data`) so it survives container restarts.

---

## Database Schema

```
┌─────────────────────────────────────┐
│               users                  │
├──────────────┬──────────────────────┤
│ id           │ INT UNSIGNED PK AI    │
│ name         │ VARCHAR(100) NOT NULL │
│ email        │ VARCHAR(255) UNIQUE   │
│ password_hash│ VARCHAR(255) NOT NULL │  ← bcrypt, never plaintext
│ role         │ ENUM(user, admin)     │
│ created_at   │ DATETIME              │
│ updated_at   │ DATETIME              │
└──────────────┴──────────────────────┘
        │  1
        │
        │  N
┌───────▼─────────────────────────────┐
│               tasks                  │
├──────────────┬──────────────────────┤
│ id           │ INT UNSIGNED PK AI    │
│ user_id      │ INT UNSIGNED FK       │  ← CASCADE DELETE
│ title        │ VARCHAR(255) NOT NULL │
│ description  │ TEXT                  │
│ status       │ ENUM(todo,in_progress │
│              │ ,done)                │
│ priority     │ ENUM(low,medium,high) │
│ due_date     │ DATETIME              │
│ created_at   │ DATETIME              │
│ updated_at   │ DATETIME              │
└──────────────┴──────────────────────┘

Indexes: user_id, status, priority, due_date
```

---

## API Reference

Base URL: `/api/v1`  
Authentication: `Authorization: Bearer <token>`

### Auth — no token required

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/auth/register` | `{name, email, password, role?}` | Register a new user, returns JWT |
| `POST` | `/auth/login` | `{email, password}` | Login, returns JWT |

### Users — token required

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users/me` | Get authenticated user's profile |

### Tasks — token required

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tasks` | List own tasks (`?status=` `?priority=`) |
| `POST` | `/tasks` | Create a new task |
| `GET` | `/tasks/:id` | Get a single task |
| `PUT` | `/tasks/:id` | Partial update a task |
| `DELETE` | `/tasks/:id` | Delete a task |

> Regular users can only access their **own** tasks. Admins can access **any** task.

### Admin — admin token required

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/users` | List all registered users |
| `GET` | `/admin/tasks` | List all tasks with user info joined |

### Standard response shape

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "...", "errors": { "field": ["msg"] } }
```

---

## Security Practices

| Practice | Implementation |
|---|---|
| Password hashing | `bcryptjs` with **12 salt rounds** — intentionally slow to prevent brute force |
| Timing-safe login | Dummy hash compared even when user is not found — prevents email enumeration via response timing |
| JWT signing | HS256, env-configurable expiry, `JWT_SECRET` enforced ≥ 32 chars at startup |
| Role-based access | `withAuth(handler, "admin")` HOF — role enforced server-side on every request |
| Input validation | Zod schemas on every endpoint — rejects unknown fields, enforces types and lengths |
| SQL injection prevention | All queries use `mysql2` parameterised placeholders (`?`) — never string concatenation |
| Error messages | Generic `"Invalid email or password"` for auth failures — no user-enumeration |
| API versioning | `/api/v1/` prefix — adding `/api/v2/` never breaks existing clients |
| No `SELECT *` | Only named columns are selected — limits data exposure |

---

## Frontend Pages

All frontend pages are built with **Next.js App Router** and styled entirely with **Tailwind CSS** utility classes. No separate CSS files or CSS modules are used for component styling.

| Page | Path | Description |
|---|---|---|
| Login | `/login` | Email + password form, JWT stored in `localStorage` |
| Register | `/register` | Account creation with role selection, inline validation errors |
| Dashboard | `/dashboard` | Kanban board (To Do / In Progress / Done), create/edit/delete modals, admin user table |
| API Docs | `/api-docs` | Live Swagger UI connected to `/api/v1/docs` |

---

## Scalability Notes

### 1. Stateless JWT — horizontal scaling ready
Tokens are self-contained (no server-side session storage). Any number of app replicas can verify tokens independently — just share the same `JWT_SECRET`. Deploy behind an Nginx or AWS ALB load balancer with zero changes.

### 2. Connection pooling
`mysql2` pool (limit=10) is a singleton — shared across all Next.js API route invocations within a process. In production: deploy multiple containers, each with their own pool, all pointing to one MySQL primary (or a PlanetScale / AWS RDS endpoint).

### 3. Microservices path
The codebase has clear domain separation: `auth`, `users`, `tasks`, `admin`. Each domain can be split into an independent service:

```
api-gateway (Kong / Nginx)
    ├── auth-service     → /api/v1/auth/*
    ├── task-service     → /api/v1/tasks/*
    └── admin-service    → /api/v1/admin/*
```

JWT validation can be moved to the gateway layer, removing it from each service.

### 4. Caching (Redis — recommended next step)
- **Rate limiting** per IP: `upstash/ratelimit` + Redis — prevents brute-force attacks
- **Token blacklisting**: store invalidated JWTs in Redis on logout (TTL = remaining token lifespan)
- **Query cache**: cache expensive `admin/tasks` aggregations with a short TTL (30s)

### 5. Database scaling
- **Read replicas**: direct `SELECT` queries to replicas, writes to the primary
- **Partitioning**: partition the `tasks` table by `user_id` range at very high scale
- **Managed DB**: swap `mysql2` pool host to PlanetScale, AWS RDS, or Google Cloud SQL — zero code changes needed

### 6. Logging & observability
- Add `pino` for structured JSON logging — ship logs to Datadog / CloudWatch
- Add OpenTelemetry traces on each API route for latency tracking
- Health-check endpoint at `/api/health` for load-balancer and Kubernetes liveness probes

---

*Primetrade.ai Backend Internship Assignment — 2026*
