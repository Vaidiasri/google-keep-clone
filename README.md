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
- **Role-Based Access**: Admin, User, and Guest roles with granular permissions
- **Nested Todo Management**: Hierarchical todo organization with subtasks
- **Real-time Caching**: Two-layer caching (Identity + Resource) for performance
- **Concurrency Control**: ETag-based optimistic locking to prevent lost updates

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
- ✅ Progress tracking
- ✅ User-specific todo isolation
- ✅ Admin oversight capabilities

### Admin Features

- ✅ User management dashboard
- ✅ Role assignment and modification
- ✅ User deletion capabilities
- ✅ System-wide todo visibility

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
│                 │      │                  │      │                 │
│  React Frontend │─────▶│  FastAPI Backend │─────▶│  PostgreSQL DB  │
│   (Vite + TS)   │      │   (Python 3.x)   │      │                 │
│                 │      │                  │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                  │
                                  │
                         ┌────────▼────────┐
                         │                 │
                         │  Policy Engine  │
                         │  (PBAC System)  │
                         │                 │
                         └─────────────────┘
```

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
├── todo/                          # React Frontend
│   ├── src/
│   │   ├── components/           # Reusable components
│   │   │   └── MFASetup.tsx     # MFA configuration component
│   │   ├── context/             # React Context providers
│   │   │   └── AuthContext.tsx  # Authentication state
│   │   ├── page/                # Page components
│   │   │   ├── AdminUsers.tsx   # Admin user management
│   │   │   ├── LogIn.tsx        # Login page
│   │   │   ├── Register.tsx     # Registration page
│   │   │   └── NestedTodo.tsx   # Todo management
│   │   ├── App.tsx              # Root component
│   │   └── main.tsx             # Entry point
│   ├── package.json
│   └── vite.config.ts
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

#### 5. Create Test Admin User

The application comes with a script to create a test admin user for quick setup:

```bash
cd todo-fast-api
python scripts/create_test_admin.py
```

**Default Test Admin Credentials:**

```
Email:    admin@test.com
Password: admin123
Role:     ADMIN
MFA:      Disabled
```

> ⚠️ **Security Note**: These are test credentials for development only. Change them in production!

#### 6. Switch Backend (Optional)

The frontend can connect to either Python (FastAPI) or Node.js (Fastify) backend:

**Edit `todo/src/config/api.config.ts`:**

```typescript
// For Python Backend (Port 8000)
export const USE_FASTAPI = true;

// For Node.js Backend (Port 8080)
export const USE_FASTAPI = false;
```

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
VITE_API_BASE_URL=http://localhost:8000
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

#### Admin

- `GET /admin/users` - Get all users
- `PUT /admin/users/{id}/role` - Update user role
- `DELETE /admin/users/{id}` - Delete user

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

- [IAM Architecture Research](./todo-fast-api/README_IAM.md) - Deep dive into PBAC implementation
- [Deployment Guide](./DEPLOY.md) - Docker Hub deployment instructions

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
