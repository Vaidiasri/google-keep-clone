# 🚀 Full-Stack Todo Application with Advanced IAM

A production-ready, enterprise-grade Todo application featuring **Policy-Based Access Control (PBAC)**, **Multi-Factor Authentication (MFA)**, and **Role-Based Access Management**. Built with modern technologies and cloud-native architecture principles.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Troubleshooting](#-troubleshooting)
- [Quick Start Checklist](#-quick-start-checklist)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Security Features](#-security-features)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🎯 Overview

This is a comprehensive full-stack application that demonstrates enterprise-level authentication, authorization, and access control patterns. The project implements advanced IAM (Identity and Access Management) concepts inspired by cloud providers like GCP, AWS, and Azure.

### Key Highlights

- **Advanced PBAC System**: Policy-based access control with attribute evaluation
- **Multi-Factor Authentication**: TOTP-based MFA with QR code generation
- **Role-Based Access**: Admin and User roles with granular permissions
- **Nested Todo Management**: Hierarchical todos with drag-and-drop board/list views
- **Today's Focus**: Priority-sorted dashboard for what to work on next
- **Fun Stack**: Boss battles, Focus Roulette, completion bursts, Smart Split
- **AI Stack**: Focus Coach, Daily Briefing, Boss Lore, AI Smart Split
- **Theme Studio**: Custom neon/glass presets with full-app theming
- **Admin Console**: User CRUD, groups, and cross-user task visibility
- **Hybrid Backend**: Fastify for todos/auth, FastAPI for AI (recommended)

---

## ✨ Features

### Authentication & Authorization

- ✅ JWT-based authentication with refresh tokens
- ✅ Multi-Factor Authentication (MFA) using TOTP
- ✅ Policy-based access control (PBAC)
- ✅ Role-based permissions (Admin, User, Guest)
- ✅ Email verification system
- ✅ Password hashing with bcrypt

### Todo Management

- ✅ Create, Read, Update, Delete todos
- ✅ Nested todo structure (parent-child relationships)
- ✅ Board view, list view, and Today's Focus dashboard
- ✅ Drag-and-drop reordering and per-task priority
- ✅ Progress tracking with sidebar stats
- ✅ User-specific todo isolation

### Fun & AI Features

- ✅ Boss Battle mode (HP tied to subtask progress)
- ✅ Focus Roulette with optional AI Coach recommendations
- ✅ Completion burst animations
- ✅ Smart Split (regex + AI) for bullet-list task creation
- ✅ Daily AI Briefing and Boss Lore
- ✅ Natural-language task parsing

### Theme & UX

- ✅ Theme Studio with custom presets (neon, glass, gradients)
- ✅ Light / dark / system modes
- ✅ Keyboard shortcuts (`G+F` focus, `G+B` board, `G+L` list, etc.)
- ✅ Consistent theming on main app and Admin Console

### Admin Features

- ✅ Admin Console at `/admin` (Users, Groups, All Tasks tabs)
- ✅ User CRUD with role and group assignment
- ✅ View any user's task tree
- ✅ Filter all tasks by user or group

### Performance & Security

- ✅ Two-layer caching system (Identity + Resource)
- ✅ ETag-based concurrency control
- ✅ Rate limiting and request validation
- ✅ CORS configuration
- ✅ Secure environment variable management

---

## 🏗️ Architecture

This project follows a **microservices-inspired architecture** with clear separation of concerns:

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  React Frontend │─────▶│ Fastify Backend  │─────▶│  PostgreSQL DB  │
│   (Vite + TS)   │      │  todos · auth    │      │  (Prisma)       │
│   TaskFlow      │      │  admin · :8080   │      │                 │
└────────┬────────┘      └──────────────────┘      └─────────────────┘
         │
         │  AI routes (hybrid mode)
         ▼
┌──────────────────┐      ┌─────────────────┐
│  FastAPI Backend │─────▶│  PostgreSQL DB  │
│  AI · PBAC · :8000│     │  (SQLAlchemy)   │
└──────────────────┘      └─────────────────┘
```

**Hybrid mode (recommended):** todos, auth, and admin go to Fastify; AI endpoints go to FastAPI with automatic fallback to Fastify if Python is down.

### Backend Architecture (FastAPI)

- **Policy Engine**: Centralized authorization logic
- **Caching Layer**: In-memory caching for identity and resources
- **Email Service**: Async email notifications
- **Database Layer**: SQLAlchemy ORM with PostgreSQL

### Frontend Architecture (React + Vite)

- **Context API**: Global authentication state management
- **React Router**: Client-side routing
- **Axios**: HTTP client with interceptors
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling

---

## 🛠️ Tech Stack

### Frontend (`/todo`)

| Technology         | Purpose                 |
| ------------------ | ----------------------- |
| **React 19**       | UI framework            |
| **TypeScript**     | Type safety             |
| **Vite**           | Build tool & dev server |
| **Tailwind CSS 4** | Styling                 |
| **Radix UI**       | Accessible components   |
| **React Router**   | Routing                 |
| **Axios**          | HTTP client             |
| **Lucide React**   | Icons                   |

### Backend (`/todo-fast-api`)

| Technology       | Purpose              |
| ---------------- | -------------------- |
| **FastAPI**      | Web framework        |
| **Python 3.x**   | Programming language |
| **SQLAlchemy**   | ORM                  |
| **PostgreSQL**   | Database             |
| **Pydantic**     | Data validation      |
| **PyOTP**        | MFA implementation   |
| **python-jose**  | JWT handling         |
| **FastAPI-Mail** | Email service        |
| **Passlib**      | Password hashing     |

### Legacy Backend (`/todoBackend`)

| Technology      | Purpose               |
| --------------- | --------------------- |
| **Fastify**     | Node.js web framework |
| **Prisma**      | Database ORM          |
| **TypeScript**  | Type safety           |
| **bcryptjs**    | Password hashing      |
| **fastify-jwt** | JWT authentication    |

---

## 📁 Project Structure

```
frontend/
├── todo/                          # React Frontend (TaskFlow)
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/           # Admin Console tabs
│   │   │   ├── ai/              # Briefing, coach, NL preview
│   │   │   ├── fun/             # Roulette, boss HP, settings
│   │   │   ├── ui/              # shadcn/ui primitives
│   │   │   └── ThemeStudio.tsx
│   │   ├── context/             # AuthContext, ThemeContext
│   │   ├── hooks/               # Priority, shortcuts, fun/AI hooks
│   │   ├── page/
│   │   │   ├── NestedTodo.tsx   # Main task board
│   │   │   ├── AdminUsers.tsx   # Admin Console
│   │   │   ├── LogIn.tsx
│   │   │   └── Register.tsx
│   │   ├── services/            # todo, admin, ai API clients
│   │   ├── config/api.config.ts # Backend mode & URLs
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── README.md
│   ├── FUN_STACK_PLAN.md
│   └── package.json
│
├── todo-fast-api/                # Python FastAPI Backend
│   ├── modal/                   # Database models
│   │   └── todo.py
│   ├── schema/                  # Pydantic schemas
│   ├── scripts/                 # Utility scripts
│   │   └── create_super_admin.py
│   ├── main.py                  # FastAPI application
│   ├── database.py              # Database configuration
│   ├── policy_engine.py         # PBAC implementation
│   ├── policies.py              # Policy definitions
│   ├── utils.py                 # Utility functions
│   ├── utils_cache.py           # Caching utilities
│   ├── utils_email.py           # Email utilities
│   ├── requirements.txt
│   └── README_IAM.md            # IAM documentation
│
├── todoBackend/                 # Node.js Fastify Backend (Legacy)
│   ├── src/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── docker-compose.yml           # Docker orchestration
├── DEPLOY.md                    # Deployment guide
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **PostgreSQL** (v14 or higher)
- **Docker** (optional, for containerized deployment)

### Installation

#### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd frontend
```

#### 2. Setup Frontend

```bash
cd todo
npm install
cp .env.example .env
# Configure your .env file
npm run dev
```

The frontend will run on `http://localhost:5173`

#### 3. Setup Backend (FastAPI)

```bash
cd todo-fast-api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Configure your .env file with database credentials
uvicorn main:app --reload --port 8000
```

The backend will run on `http://localhost:8000`

#### 4. Setup Database

```bash
# Create PostgreSQL database
createdb todo_db

# Run migrations (if applicable)
# The application will create tables automatically on first run
```

#### 5. Start Fastify Backend (todos, auth, admin)

```bash
cd todoBackend
npm install
npx prisma generate
npm run dev
```

Runs on **http://localhost:8080**

#### 6. Create Admin User (Fastify)

```bash
cd todoBackend
npm run create-admin
# Default: admin@test.com / admin123
```

Or for the Python backend:

```bash
cd todo-fast-api
python scripts/create_test_admin.py
```

> ⚠️ **Security Note**: Default credentials are for development only. Change them in production!

#### 7. Configure Backend Mode

Edit `todo/.env`:

```env
# Recommended when both backends are running
VITE_BACKEND_MODE=hybrid
VITE_API_URL_NODE=http://localhost:8080
VITE_API_URL_PYTHON=http://localhost:8000
```

| Mode | Todos & Auth | AI |
| --- | --- | --- |
| `fastify` | Fastify `:8080` | Fastify |
| `fastapi` | FastAPI `:8000` | FastAPI |
| `hybrid` | Fastify `:8080` | FastAPI `:8000` |

See [todo/README.md](./todo/README.md) for frontend-specific docs.

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. **`ts-node-dev` not found (Node.js Backend)**

**Error:**

```
'ts-node-dev' is not recognized as an internal or external command
```

**Solution:**

```bash
cd todoBackend
npm install --save-dev ts-node-dev
```

#### 2. **Prisma Client Not Initialized (Node.js Backend)**

**Error:**

```
@prisma/client did not initialize yet. Please run "prisma generate"
```

**Solution:**

```bash
cd todoBackend
npx prisma generate
npx prisma migrate dev  # If migrations needed
```

#### 3. **Database Connection Failed**

**Error:**

```
Could not connect to database
```

**Solution:**

- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env` file
- Ensure database exists: `createdb todo_db`
- Test connection: `psql -U your_user -d todo_db`

#### 4. **Login Fails with "Invalid credentials"**

**Possible Causes:**

- Wrong backend selected in `api.config.ts`
- User doesn't exist in the database
- Password mismatch

**Solution:**

```bash
# Create/reset test admin
cd todo-fast-api
python scripts/create_test_admin.py

# Verify backend is running
curl http://localhost:8000/  # Python
curl http://localhost:8080/ping  # Node.js

# Check frontend is pointing to correct backend
# Edit todo/src/config/api.config.ts
```

#### 5. **CORS Errors**

**Error:**

```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:**

- Backend CORS is already configured for `*` in development
- If still facing issues, check backend logs
- Ensure backend is running on correct port

#### 6. **Port Already in Use**

**Error:**

```
EADDRINUSE: address already in use :::8000
```

**Solution:**

```bash
# Find process using the port
# Windows
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

#### 7. **MFA Setup Issues**

If you don't want MFA during development:

```bash
# Create admin without MFA
cd todo-fast-api
python scripts/create_test_admin.py  # MFA disabled by default
```

Or disable MFA for existing user:

```sql
UPDATE "User" SET mfa_enabled = false WHERE email = 'your@email.com';
```

---

## 📋 Quick Start Checklist

Use this checklist to ensure everything is set up correctly:

- [ ] PostgreSQL installed and running
- [ ] Database created (`createdb todo_db`)
- [ ] Python backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env` files)
- [ ] Test admin user created (`python scripts/create_test_admin.py`)
- [ ] Backend running on port 8000 (Python) or 8080 (Node.js)
- [ ] Frontend running on port 5173
- [ ] Can login with test credentials (`admin@test.com` / `admin123`)

---

## 🔐 Environment Variables

### Frontend (`/todo/.env`)

```env
VITE_BACKEND_MODE=hybrid
VITE_API_URL_NODE=http://localhost:8080
VITE_API_URL_PYTHON=http://localhost:8000
```

### Backend (`/todo-fast-api/.env`)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/todo_db

# JWT Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email Configuration
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_FROM_NAME=Todo App

# Application
FRONTEND_URL=http://localhost:5173
```

---

## 📚 API Documentation

Once the backend is running, visit:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

#### Authentication

- `POST /register` - Register new user
- `POST /login` - Login and get JWT token
- `POST /verify-email` - Verify email address
- `POST /setup-mfa` - Setup MFA
- `POST /verify-mfa` - Verify MFA token

#### Todos

- `GET /todos` - Get all todos (user-specific)
- `POST /todos` - Create new todo
- `PUT /todos/{id}` - Update todo
- `DELETE /todos/{id}` - Delete todo
- `GET /todos/{id}/children` - Get nested todos

#### Admin (Fastify — `:8080`)

- `GET /admin/users` — List users with groups and task counts
- `POST /admin/users` — Create user
- `PATCH /admin/users/:id` — Update user, role, groups, password
- `DELETE /admin/users/:id` — Delete user and their tasks
- `GET /admin/users/:id/todos` — User's task tree
- `GET /admin/todos` — All tasks (filter by `userId` or `groupId`)
- `GET/POST/PATCH/DELETE /admin/groups` — Group CRUD
- `PUT /admin/groups/:id/members` — Assign group members

#### AI (FastAPI — `:8000` in hybrid mode)

- `POST /ai/split` — Smart Split
- `POST /ai/coach` — Focus Coach recommendation
- `POST /ai/briefing` — Daily briefing
- `POST /ai/boss-lore` — Boss taunt/lore
- `POST /ai/parse-task` — Natural-language task parsing

---

## 🔒 Security Features

### Policy-Based Access Control (PBAC)

The application implements a sophisticated PBAC system inspired by cloud IAM architectures:

```python
# Example policy evaluation
policy = {
    "resource": "todo",
    "action": "delete",
    "conditions": {
        "owner": True,
        "role": ["admin", "user"]
    }
}
```

### Caching Strategy

**Two-Layer Caching System:**

1. **Identity Cache**: Stores user roles and permissions
2. **Resource Cache**: Stores todo metadata for quick access

### Concurrency Control

Uses **ETag-based optimistic locking** to prevent lost updates:

```http
If-Match: "etag-value-here"
```

### MFA Implementation

- TOTP-based (Time-based One-Time Password)
- QR code generation for easy setup
- Backup codes for account recovery

---

## 🐳 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions including:

- Docker Hub publishing
- Environment configuration
- Production best practices

---

## 📖 Additional Documentation

- [TaskFlow Frontend README](./todo/README.md) — features, shortcuts, backend modes
- [Fun & AI Stack Plan](./todo/FUN_STACK_PLAN.md) — feature spec and sprint plan
- [IAM Architecture Research](./todo-fast-api/README_IAM.md) — PBAC deep dive
- [Deployment Guide](./DEPLOY.md) — Docker Hub deployment instructions

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

Built with ❤️ by **ghild**

---

## 🙏 Acknowledgments

- Inspired by cloud IAM architectures (GCP, AWS, Azure)
- FastAPI framework and community
- React and Vite ecosystems
- Radix UI for accessible components

---

## 📞 Support

For issues and questions:

- Open an issue on GitHub
- Check existing documentation in `/todo-fast-api/README_IAM.md`

---

**Happy Coding! 🚀**
