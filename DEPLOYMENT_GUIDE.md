# Complete Deployment Guide — EC2 + Docker + GitHub Actions CI/CD

This guide covers everything needed to deploy any full-stack Docker app to AWS EC2 with automatic CI/CD via GitHub Actions.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Phase 1 — Prepare Your App](#phase-1--prepare-your-app)
- [Phase 2 — Launch EC2 Instance](#phase-2--launch-ec2-instance)
- [Phase 3 — Elastic IP](#phase-3--elastic-ip)
- [Phase 4 — SSH into Server](#phase-4--ssh-into-server)
- [Phase 5 — Install Docker & Git](#phase-5--install-docker--git)
- [Phase 6 — Deploy the App](#phase-6--deploy-the-app)
- [Phase 7 — GitHub Actions CI/CD](#phase-7--github-actions-cicd)
- [Phase 8 — Create Admin User](#phase-8--create-admin-user)
- [Day-to-Day Commands](#day-to-day-commands)
- [Troubleshooting](#troubleshooting)
- [Cost Reference](#cost-reference)

---

## Architecture Overview

```
Developer pushes code
        ↓
   GitHub (main)
        ↓
  GitHub Actions
        ↓
   SSH into EC2
        ↓
  git pull + docker compose up --build
        ↓
  App live at http://YOUR_EC2_IP
```

**Stack on EC2:**

| Container | Port | Purpose |
|---|---|---|
| frontend | 80 | React SPA (nginx) |
| fastify | 8080 | Node.js backend |
| fastapi | 8000 | Python backend |
| postgres | 5432 | Database |

---

## Prerequisites

- AWS account (free tier works for t3.small)
- GitHub account with your code pushed
- Windows PC with PowerShell
- Your `.pem` key file saved locally

---

## Phase 1 — Prepare Your App

### 1.1 Required files in your repo

Before deploying, make sure these files exist:

```
your-repo/
├── docker-compose.yml          ← defines all services
├── .env.docker.example         ← env template (no real secrets)
├── todo/
│   ├── Dockerfile              ← multi-stage: build + nginx
│   └── nginx.conf              ← SPA fallback routing
├── todoBackend/
│   └── Dockerfile              ← node production build
└── todo-fast-api/
    └── Dockerfile              ← python uvicorn
```

### 1.2 Frontend Dockerfile (multi-stage)

```dockerfile
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_BACKEND_MODE=hybrid
ARG VITE_API_URL_NODE
ARG VITE_API_URL_PYTHON
ENV VITE_BACKEND_MODE=$VITE_BACKEND_MODE \
    VITE_API_URL_NODE=$VITE_API_URL_NODE \
    VITE_API_URL_PYTHON=$VITE_API_URL_PYTHON
RUN npm run build

# Stage 2: serve
FROM nginx:1.27-alpine
RUN apk add --no-cache curl
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

### 1.3 nginx.conf (SPA routing)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 1.4 docker-compose.yml structure

```yaml
services:
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-todo}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-todo}
      POSTGRES_DB: ${POSTGRES_DB:-todo}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-todo}"]
      interval: 5s
      retries: 10

  fastify:
    build: ./todoBackend
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy

  fastapi:
    build: ./todo-fast-api
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      fastify:                        # wait for fastify migrations first
        condition: service_healthy

  frontend:
    build:
      context: ./todo
      args:
        VITE_BACKEND_MODE: ${VITE_BACKEND_MODE:-hybrid}
        VITE_API_URL_NODE: ${VITE_API_URL_NODE}
        VITE_API_URL_PYTHON: ${VITE_API_URL_PYTHON}
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - fastify
      - fastapi

volumes:
  pgdata:
```

> **Important:** `fastapi` must depend on `fastify` being healthy — not just postgres. This prevents FastAPI's `Base.metadata.create_all()` from creating tables before Prisma migrations run.

### 1.5 Migration file ordering (Prisma)

Prisma runs migrations in alphabetical order by folder name. Make sure timestamps are in the correct logical order:

```
prisma/migrations/
  20251210072515_init/              ← creates base tables
  20251211041657_add_user_model/    ← creates User table
  20251212000000_add_user_role/     ← alters User table  ✅ AFTER user exists
  20251213000000_add_user_groups/   ← adds group tables  ✅ AFTER user exists
```

If a migration alters a table, its timestamp must be AFTER the migration that creates that table.

---

## Phase 2 — Launch EC2 Instance

Go to AWS Console → EC2 → Launch Instance.

### 2.1 Configuration

| Setting | Value | Notes |
|---|---|---|
| AMI | Ubuntu 24.04 or 26.04 LTS | 64-bit (x86), amd64 |
| Instance type | **t3.small** | 2 vCPU, 2 GB RAM minimum |
| Key pair | Create new (.pem) | **Save it — cannot re-download** |
| Storage | **20 GB gp3** | Default 8 GB fills up fast |
| Auto-assign IP | Enable | Use Elastic IP for permanent address |

> **Do NOT use t2.micro** — 1 GB RAM is too small for 4 Docker containers and will crash.

### 2.2 Security Group — Inbound Rules

| Port | Protocol | Source | Purpose |
|---|---|---|---|
| 22 | TCP | My IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | Frontend (React app) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (for future domain) |
| 8080 | TCP | 0.0.0.0/0 | Node/Fastify backend |
| 8000 | TCP | 0.0.0.0/0 | Python/FastAPI backend |

Click **Launch Instance**.

---

## Phase 3 — Elastic IP

Elastic IP gives your server a **permanent IP** that doesn't change on restart.

1. EC2 → **Network & Security** → **Elastic IPs**
2. Click **Allocate Elastic IP address** → Allocate
3. Select the new IP → **Actions** → **Associate Elastic IP address**
4. Resource type: **Instance** → select your instance → **Associate**

> Elastic IPs are **free** while attached to a running instance. You are charged ~$0.005/hr if allocated but NOT attached.

---

## Phase 4 — SSH into Server

### 4.1 Fix .pem file permissions (run once on Windows)

```powershell
icacls "C:\Users\YOU\Downloads\keyname.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

### 4.2 Connect via SSH

```powershell
ssh -i "C:\Users\YOU\Downloads\keyname.pem" ubuntu@YOUR_EC2_IP
```

When asked: `Are you sure you want to continue connecting?` — type `yes` and press Enter.

You are connected when you see:
```
ubuntu@ip-172-xx-xx-xx:~$
```

---

## Phase 5 — Install Docker & Git

Run these commands on the EC2 server (one time only):

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com | sudo sh

# 3. Add ubuntu user to docker group (no sudo needed)
sudo usermod -aG docker ubuntu

# 4. Install Git
sudo apt install git -y

# 5. Apply docker group change
newgrp docker

# 6. Verify both installed
docker --version
docker compose version
```

Expected output:
```
Docker version 27.x.x
Docker Compose version v2.x.x
```

---

## Phase 6 — Deploy the App

### 6.1 Clone your repository

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO
```

### 6.2 Create environment file

```bash
cat > .env.docker << 'EOF'
JWT_SECRET=change-me-use-a-long-random-string
GEMINI_API_KEY=your-gemini-key-here

POSTGRES_USER=todo
POSTGRES_PASSWORD=todo
POSTGRES_DB=todo

CORS_ORIGINS=http://YOUR_EC2_IP,http://YOUR_EC2_IP:80

VITE_BACKEND_MODE=hybrid
VITE_API_URL_NODE=http://YOUR_EC2_IP:8080
VITE_API_URL_PYTHON=http://YOUR_EC2_IP:8000

AI_PROVIDER=gemini
AI_MODEL=gemini-2.0-flash
AI_MAX_REQUESTS_PER_USER_PER_DAY=50
EOF
```

> Replace `YOUR_EC2_IP` with your Elastic IP (e.g. `15.207.62.83`).

### 6.3 Start the stack

```bash
docker compose --env-file .env.docker up --build -d
```

First run takes **5–10 minutes** (downloads base images, builds app).

### 6.4 Verify all containers are healthy

```bash
docker compose ps
```

All 4 should show `(healthy)`:

```
NAME               IMAGE              STATUS
postgres-1         postgres:15        Up (healthy)
fastify-1          taskflow-fastify   Up (healthy)
fastapi-1          taskflow-fastapi   Up (healthy)
frontend-1         taskflow-frontend  Up (healthy)
```

### 6.5 Test endpoints

```bash
curl http://localhost:8080/ping    # → {"status":"ok"}
curl http://localhost:8000/health  # → {"status":"ok"}
curl -I http://localhost           # → HTTP/1.1 200 OK
```

Open browser: `http://YOUR_EC2_IP` — app should load.

---

## Phase 7 — GitHub Actions CI/CD

CI/CD means every `git push` to `main` automatically deploys to EC2. No manual SSH needed.

### 7.1 Add GitHub Secrets

Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Value |
|---|---|
| `EC2_HOST` | Your Elastic IP (e.g. `15.207.62.83`) |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Full contents of your `.pem` file (including header/footer lines) |

For `EC2_SSH_KEY`: open the `.pem` file in Notepad, select all, copy and paste.

### 7.2 Create deploy workflow

Create `.github/workflows/deploy.yml` in your repo:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to EC2 via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/YOUR_REPO
            git pull origin main
            docker compose --env-file .env.docker up --build -d
            docker compose ps
```

### 7.3 Push and verify

```powershell
git add .github/workflows/deploy.yml
git commit -m "Add EC2 auto-deploy workflow"
git push origin main
```

Go to GitHub → **Actions** tab. The workflow should turn green in 1–2 minutes.

**From now on:** every `git push` to `main` auto-deploys. No SSH needed.

---

## Phase 8 — Create Admin User

Since `ts-node` is not available in the production container, create the admin via SQL:

### 8.1 Register via the UI

1. Open `http://YOUR_EC2_IP`
2. Click **"Create one"** (register)
3. Use any email/password

### 8.2 Promote to admin via SQL

```bash
docker exec -it <postgres-container-name> psql -U todo -d todo -c \
  "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

Output should be `UPDATE 1`. Refresh the browser — admin panel is now visible.

To find the postgres container name:
```bash
docker compose ps
```

---

## Day-to-Day Commands

### Viewing status

```bash
docker compose ps                        # all container statuses
docker compose logs -f fastify           # stream fastify logs
docker compose logs -f fastapi           # stream fastapi logs
docker compose logs --tail=50 frontend   # last 50 lines of frontend logs
```

### Restarting

```bash
docker compose restart fastify           # restart one service
docker compose up -d                     # start without rebuild
docker compose up --build -d             # rebuild and start
```

### Stopping

```bash
docker compose down                      # stop (keeps database data)
docker compose down -v                   # stop + DELETE all data
```

### Updating after code change (manual)

```bash
git pull origin main
docker compose --env-file .env.docker up --build -d
```

### Database access

```bash
docker exec -it <postgres-container> psql -U todo -d todo
```

Useful SQL inside psql:
```sql
\dt                          -- list all tables
SELECT * FROM "User";        -- view all users
UPDATE "User" SET role = 'ADMIN' WHERE email = 'x@x.com';
\q                           -- quit
```

### Disk cleanup

```bash
docker system prune -f       # remove unused images/containers
docker volume prune -f       # remove unused volumes (careful!)
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Container keeps restarting | App crash / bad env var | `docker compose logs <service>` — read the error |
| Prisma P3005 error | Schema not empty when running migrations | FastAPI started before Fastify — fix `depends_on` in docker-compose |
| Prisma P3009 error | A migration failed previously | Migration SQL error — fix the SQL, then `docker compose down -v` and restart |
| `git pull` fails (.env conflict) | .env.docker is untracked and conflicts | `rm .env.docker`, pull, recreate the file |
| Port already in use | Old containers still running | `docker compose down` then restart |
| App loads but login fails | Wrong password hash in DB | Register via UI, then promote via SQL |
| GitHub Actions fails | Wrong secrets or SSH key | Check secret names match exactly. Paste full .pem including header lines |
| No space left on device | Docker images filling disk | `docker system prune -f` |
| SSH permission denied | Wrong .pem permissions | Run `icacls` fix command again |
| SSH connection refused | Security group missing port 22 | Add port 22 inbound rule in AWS Security Group |
| App not reachable on port 80 | Security group missing port 80 | Add port 80 inbound rule in AWS Security Group |

---

## Cost Reference

| Service | Spec | Cost/month |
|---|---|---|
| EC2 t3.small | 2 vCPU, 2 GB RAM | ~$15–17 |
| EBS storage 20 GB gp3 | SSD | ~$1.60 |
| Elastic IP | (free while attached) | $0 |
| Data transfer | First 100 GB free | $0–$9 |
| **Total** | | **~$17–27/month** |

> **To save money:** Stop the instance when not in use (Elastic IP stays attached). You only pay for compute when running.

---

## Quick Reference Card

```
LAUNCH CHECKLIST
─────────────────────────────────────────
□ AMI: Ubuntu 24.04+ LTS (64-bit x86)
□ Instance: t3.small (NOT t2.micro)
□ Key pair: saved .pem file
□ Storage: 20 GB gp3
□ Security group: ports 22, 80, 443, 8080, 8000
□ Elastic IP: allocated and associated

SERVER SETUP (one time)
─────────────────────────────────────────
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo apt install git -y
newgrp docker

DEPLOY
─────────────────────────────────────────
git clone https://github.com/ORG/REPO.git
cd REPO
cat > .env.docker << 'EOF'
  ... fill in your values ...
EOF
docker compose --env-file .env.docker up --build -d
docker compose ps

CI/CD SECRETS (GitHub → Settings → Secrets)
─────────────────────────────────────────
EC2_HOST     = your elastic IP
EC2_USER     = ubuntu
EC2_SSH_KEY  = contents of .pem file
```

---

*Guide covers: AWS EC2 · Ubuntu · Docker · Docker Compose · GitHub Actions · Prisma · FastAPI · Fastify · React/Vite · nginx*
