# AWS Deployment Plan — TaskFlow (Docker + GitHub Actions)

Deploy the TaskFlow monorepo to AWS using production Docker images, ECS Fargate for backends, S3 + CloudFront for the frontend, RDS PostgreSQL, and GitHub Actions CI/CD.

---

## Table of Contents

- [Overview](#overview)
- [Current Gaps to Fix](#current-gaps-to-fix)
- [Recommended AWS Architecture](#recommended-aws-architecture)
- [URL Routing](#url-routing)
- [Phase 1 — Production Docker Images](#phase-1--production-docker-images)
- [Phase 2 — AWS Resources](#phase-2--aws-resources-one-time-setup)
- [Phase 3 — GitHub Actions CI/CD](#phase-3--github-actions-cicd)
- [Phase 4 — Environment & Secrets](#phase-4--environment--secrets)
- [Phase 5 — ALB Routing Rules](#phase-5--alb-routing-rules)
- [Phase 6 — Rollout Order](#phase-6--rollout-order)
- [Cost Estimate](#rough-monthly-cost-mvp)
- [Alternatives](#alternatives)
- [Pre-Deploy Checklist](#pre-deploy-checklist)
- [Related Docs](#related-docs)

---

## Overview

TaskFlow is a hybrid full-stack app:

| Component | Path | Role |
| --- | --- | --- |
| **React frontend** | `todo/` | SPA (Vite + React 19) |
| **Fastify backend** | `todoBackend/` | Todos, auth, admin (`:8080`) |
| **FastAPI backend** | `todo-fast-api/` | AI routes (`:8000`) |
| **PostgreSQL** | RDS | Shared database |

**Recommended mode in production:** `VITE_BACKEND_MODE=hybrid` — Fastify handles todos/auth/admin; FastAPI handles `/ai/*`.

---

## Current Gaps to Fix

| Issue | Today | Needed for AWS |
| --- | --- | --- |
| Frontend image | Runs `npm run dev` (Vite dev server) | Multi-stage build → static files served by **nginx** |
| FastAPI | No Dockerfile | Add production Dockerfile + uvicorn |
| `docker-compose.yml` | Only Fastify + frontend; old `VITE_API_BASE_URL` | Add FastAPI, Postgres, correct hybrid env |
| Vite env vars | Baked at **build time** | Pass `VITE_*` as Docker build args in CI |
| DB migrations | Prisma migrations exist | Run migrations on deploy (Fastify startup or CI job) |
| CORS | `origin: true` on Fastify | Restrict to your CloudFront/domain |

---

## Recommended AWS Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌──────────────────┐                 ┌─────────────────┐
│ CloudFront + S3  │                 │       ALB       │
│  Static React    │                 │  api.domain.com │
└──────────────────┘                 └────────┬────────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         │                    │                    │
                         ▼                    ▼                    │
                  ┌─────────────┐      ┌─────────────┐            │
                  │   Fastify   │      │   FastAPI   │            │
                  │ ECS Fargate │      │ ECS Fargate │            │
                  │    :8080    │      │    :8000    │            │
                  └──────┬──────┘      └──────┬──────┘            │
                         │                    │                    │
                         └────────┬───────────┘                    │
                                  ▼                                │
                         ┌─────────────────┐                       │
                         │  RDS PostgreSQL │                       │
                         └─────────────────┘                       │
                                                                    │
┌─────────────────┐         ┌─────────────────┐                  │
│ GitHub Actions  │────────▶│      ECR        │──────────────────┘
│  Build & Deploy │         │  Docker images  │
└─────────────────┘         └─────────────────┘
                                      │
                              ┌───────▼────────┐
                              │ Secrets Manager│
                              │ JWT, DB, AI keys│
                              └────────────────┘
```

### Why this layout

- **S3 + CloudFront** — cheap, fast HTTPS for the React SPA
- **ECS Fargate** — run both backends without managing EC2
- **RDS PostgreSQL** — one database shared by Fastify (Prisma) and FastAPI (SQLAlchemy)
- **ALB** — route `/ai/*` to FastAPI, everything else to Fastify
- **ECR** — store images built by GitHub Actions
- **Secrets Manager** — no secrets in git or plain env files

---

## URL Routing

| URL | Target | Notes |
| --- | --- | --- |
| `https://app.yourdomain.com` | CloudFront → S3 | React SPA |
| `https://api.yourdomain.com/todos`, `/login`, `/admin`, … | Fastify `:8080` | Default ALB rule |
| `https://api.yourdomain.com/ai/*` | FastAPI `:8000` | ALB path rule |

### Frontend build-time env (GitHub Actions / CI)

```env
VITE_BACKEND_MODE=hybrid
VITE_API_URL_NODE=https://api.yourdomain.com
VITE_API_URL_PYTHON=https://api.yourdomain.com
```

Both backends share the same public API host; the ALB splits traffic by path.

---

## Phase 1 — Production Docker Images

> **Status: ✅ Implemented** — production Dockerfiles, full `docker-compose.yml`, CORS env vars, and local test flow below.

### Local test (Phase 1)

```bash
# From repo root
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost |
| Fastify | http://localhost:8080/ping |
| FastAPI | http://localhost:8000/health |
| Postgres | localhost:5432 |

Create admin user (after stack is up, from your host machine):

```bash
cd todoBackend
# Windows PowerShell:
$env:DATABASE_URL="postgresql://todo:todo@localhost:5432/todo"
$env:JWT_SECRET="change-me-in-production"
npm run create-admin
```

---

### 1. Frontend (`todo/Dockerfile`)

Replace the dev-server Dockerfile with a multi-stage production build:

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
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`todo/nginx.conf`** (SPA fallback):

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

> **Note:** For AWS production, prefer building the SPA in GitHub Actions and syncing to S3 (skip the frontend container entirely). The Dockerfile above is useful for local/staging or ECS-only deployments.

### 2. Fastify (`todoBackend/Dockerfile`)

The existing multi-stage Dockerfile is a good start. Add:

- Copy `prisma/` into the production stage
- Run migrations before start

```dockerfile
COPY --from=builder /app/prisma ./prisma
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
```

Ensure `prisma` is available in production (`npm install --production` may need `prisma` as a dependency, not only devDependency).

### 3. FastAPI (`todo-fast-api/Dockerfile`) — new file

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4. Local full-stack `docker-compose.yml` (target)

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: todo
      POSTGRES_PASSWORD: todo
      POSTGRES_DB: todo
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  fastify:
    build: ./todoBackend
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://todo:todo@postgres:5432/todo
      JWT_SECRET: ${JWT_SECRET:-supersecretkey}
    depends_on:
      - postgres

  fastapi:
    build: ./todo-fast-api
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://todo:todo@postgres:5432/todo
      JWT_SECRET: ${JWT_SECRET:-supersecretkey}
      AI_PROVIDER: gemini
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}
    depends_on:
      - postgres

  frontend:
    build:
      context: ./todo
      args:
        VITE_BACKEND_MODE: hybrid
        VITE_API_URL_NODE: http://localhost:8080
        VITE_API_URL_PYTHON: http://localhost:8000
    ports:
      - "80:80"
    depends_on:
      - fastify
      - fastapi

volumes:
  pgdata:
```

Test hybrid mode locally before deploying to AWS.

---

## Phase 2 — AWS Resources (one-time setup)

> **Status: 📋 Templates ready** — run `infra/aws/setup-phase2.sh`, follow [infra/README.md](./infra/README.md), fill ECS task definitions, then configure GitHub secrets.

| Resource | Purpose | Repo artifact |
| --- | --- | --- |
| **VPC** | Default VPC OK for MVP | — |
| **RDS PostgreSQL 15+** | Shared database | — |
| **ECR** | Docker images | `infra/aws/setup-phase2.sh` |
| **ECS Cluster + Services** | Fargate backends | `infra/ecs/*.json` |
| **ALB** | HTTPS + path routing | [infra/README.md](./infra/README.md) |
| **S3 + CloudFront** | Frontend SPA | deploy workflow |
| **Secrets Manager** | `JWT_SECRET`, `DATABASE_URL`, AI keys | setup script |
| **GitHub OIDC IAM role** | CI/CD without static keys | `infra/aws/github-*.json` |

**Quick start:** [infra/README.md](./infra/README.md)

---

### RDS setup notes

- Set **Public access = No**; only ECS tasks in the same VPC reach the DB
- Security group: allow inbound `5432` from the ECS task security group only
- Store connection string in Secrets Manager (not plain text in task definitions)
- Run Prisma migrations from the Fastify container on each deploy

### Create admin user (one-time after first deploy)

```bash
# Exec into Fastify task or run a one-off ECS task
cd todoBackend
npm run create-admin
# Default: admin@test.com / admin123 — change in production!
```

---

## Phase 3 — GitHub Actions CI/CD

> **Status: ✅ Implemented** — `.github/workflows/ci.yml` (PR/push validation) and `.github/workflows/deploy.yml` (ECR + ECS + S3 + CloudFront).

Workflows are in the repo. Configure AWS (Phase 2) and GitHub secrets below before the first deploy.

### GitHub repository secrets

| Secret | Description |
| --- | --- |
| `AWS_ROLE_ARN` | IAM role ARN for OIDC (no long-lived AWS keys) |
| `AWS_REGION` | e.g. `us-east-1` |
| `ECR_REGISTRY` | e.g. `123456789.dkr.ecr.us-east-1.amazonaws.com` |
| `VITE_API_URL_NODE` | `https://api.yourdomain.com` |
| `VITE_API_URL_PYTHON` | `https://api.yourdomain.com` |
| `S3_BUCKET` | e.g. `taskflow-frontend-prod` |
| `CLOUDFRONT_DIST_ID` | For cache invalidation after deploy |

Use **AWS OIDC** to authenticate GitHub Actions — do not store static `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in GitHub if avoidable.

### IAM OIDC trust (summary)

1. Create an IAM OIDC identity provider for `token.actions.githubusercontent.com`
2. Create an IAM role trusted by your GitHub repo (`repo:ORG/REPO:*`)
3. Attach policies: `AmazonEC2ContainerRegistryPowerUser`, ECS deploy, S3 sync, CloudFront invalidation

### Workflow file (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}

jobs:
  build-and-push-backends:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - service: fastify
            context: todoBackend
            dockerfile: todoBackend/Dockerfile
          - service: fastapi
            context: todo-fast-api
            dockerfile: todo-fast-api/Dockerfile
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        env:
          ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build \
            -t $ECR_REGISTRY/taskflow-${{ matrix.service }}:$IMAGE_TAG \
            -t $ECR_REGISTRY/taskflow-${{ matrix.service }}:latest \
            -f ${{ matrix.dockerfile }} \
            ${{ matrix.context }}
          docker push $ECR_REGISTRY/taskflow-${{ matrix.service }}:$IMAGE_TAG
          docker push $ECR_REGISTRY/taskflow-${{ matrix.service }}:latest

  deploy-backends:
    needs: build-and-push-backends
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Force ECS redeploy
        run: |
          aws ecs update-service \
            --cluster taskflow \
            --service taskflow-fastify \
            --force-new-deployment
          aws ecs update-service \
            --cluster taskflow \
            --service taskflow-fastapi \
            --force-new-deployment

  deploy-frontend:
    needs: build-and-push-backends
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: todo/package-lock.json

      - name: Build SPA
        working-directory: todo
        env:
          VITE_BACKEND_MODE: hybrid
          VITE_API_URL_NODE: ${{ secrets.VITE_API_URL_NODE }}
          VITE_API_URL_PYTHON: ${{ secrets.VITE_API_URL_PYTHON }}
        run: |
          npm ci
          npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Sync to S3
        run: aws s3 sync todo/dist s3://${{ secrets.S3_BUCKET }} --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/*"
```

### Optional: PR validation workflow (`.github/workflows/ci.yml`)

Run on pull requests without deploying:

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci && npm run lint && npx tsc --noEmit
        working-directory: todo
      - run: docker build -f todoBackend/Dockerfile todoBackend
      - run: docker build -f todo-fast-api/Dockerfile todo-fast-api
```

### Pipeline summary

| Trigger | Actions |
| --- | --- |
| **Pull request** | Lint, typecheck, Docker build (no push) |
| **Push to `main`** | Build images → push ECR → redeploy ECS → build SPA → sync S3 → invalidate CloudFront |

---

## Phase 4 — Environment & Secrets

### Shared (both backends)

| Variable | Source | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Secrets Manager | RDS PostgreSQL connection string |
| `JWT_SECRET` | Secrets Manager | **Must be identical** on Fastify and FastAPI |

### Fastify (`todoBackend`)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma connection |
| `JWT_SECRET` | Yes | JWT signing |
| `GEMINI_API_KEY` | No | Node AI fallback when FastAPI is down |
| `AI_MODEL` | No | Default: `gemini-2.0-flash` |

### FastAPI (`todo-fast-api`)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLAlchemy connection |
| `JWT_SECRET` | Yes | Must match Fastify for hybrid auth |
| `AI_PROVIDER` | Yes | `gemini` or `openai` |
| `GEMINI_API_KEY` | If using Gemini | From Google AI Studio |
| `OPENAI_API_KEY` | If using OpenAI | Alternative provider |
| `AI_MODEL` | No | e.g. `gemini-2.0-flash`, `gpt-4o-mini` |
| `AI_MAX_REQUESTS_PER_USER_PER_DAY` | No | Default: `50` |

### ECS task definition secrets pattern

```json
"secrets": [
  {
    "name": "DATABASE_URL",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:taskflow/prod:DATABASE_URL::"
  },
  {
    "name": "JWT_SECRET",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:taskflow/prod:JWT_SECRET::"
  },
  {
    "name": "GEMINI_API_KEY",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:taskflow/prod:GEMINI_API_KEY::"
  }
]
```

### Production CORS (Fastify)

Update `todoBackend/src/index.ts` before deploy:

```typescript
server.register(cors, {
  origin: ['https://app.yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})
```

Apply the same allowed origin on FastAPI CORS middleware.

---

## Phase 5 — ALB Routing Rules

| Priority | Path pattern | Target group | Health check |
| --- | --- | --- | --- |
| 1 | `/ai/*` | FastAPI (8000) | `GET /docs` or custom `/health` |
| 2 | `/docs`, `/redoc`, `/openapi.json` | FastAPI (optional) | — |
| 3 | `/*` (default) | Fastify (8080) | `GET /ping` |

### Listener configuration

- **Port 443 (HTTPS)** — ACM certificate attached
- **Port 80** — redirect to 443

---

## Phase 6 — Rollout Order

```
Week 1 — Docker hardening
  ├── Production Dockerfiles (frontend nginx, FastAPI)
  ├── Updated docker-compose for local full stack
  └── Lock CORS to production domain

Week 2 — AWS foundation
  ├── RDS PostgreSQL + Secrets Manager
  ├── ECR repositories + ECS cluster
  └── ALB + ACM certificate + Route 53 DNS

Week 3 — CI/CD
  ├── GitHub OIDC → AWS IAM role
  ├── .github/workflows/deploy.yml
  └── First deploy to staging environment

Week 4 — Frontend CDN
  ├── S3 bucket + CloudFront distribution
  ├── SPA build in GitHub Actions
  └── Create admin user (npm run create-admin)

Week 5 — Hardening
  ├── AWS WAF on CloudFront (optional)
  ├── CloudWatch logs + alarms (5xx, CPU, RDS connections)
  └── RDS automated backups + retention policy
```

---

## Rough Monthly Cost (MVP)

| Service | Estimate (USD/month) |
| --- | --- |
| RDS `db.t4g.micro` | $15–20 |
| ECS Fargate (2 small tasks, 0.25 vCPU / 512 MB each) | $25–40 |
| Application Load Balancer | ~$18 |
| CloudFront + S3 | $1–5 |
| Secrets Manager | ~$1 |
| **Total** | **~$60–85/month** |

**Cost-saving tip:** For dev/staging, run a single smaller Fargate task or use one EC2 instance with `docker compose` instead of full ECS.

---

## Alternatives

| Approach | Pros | Cons |
| --- | --- | --- |
| **ECS Fargate + ALB + S3/CloudFront** (recommended) | Scalable, managed, fits hybrid backends | More setup than a single VM |
| **Single EC2 + docker compose** | Fastest to ship, lowest learning curve | You manage OS, scaling, SSL, patches |
| **AWS App Runner** | Very simple container deploy | Hard to route two backends on one domain |
| **ECS only (no S3)** | Single platform for all services | Frontend container costs more than S3 + CloudFront |
| **EKS (Kubernetes)** | Maximum flexibility | Overkill for this project size |

---

## Pre-Deploy Checklist

- [ ] Frontend uses production build (`npm run build`), not Vite dev server
- [ ] FastAPI Dockerfile added and tested locally
- [ ] `JWT_SECRET` is identical on Fastify and FastAPI
- [ ] Prisma migrations run automatically on Fastify container start
- [ ] CORS restricted to `https://app.yourdomain.com`
- [ ] GitHub Actions uses OIDC (no static AWS access keys in repo secrets)
- [ ] `.env` files are gitignored; production secrets in AWS Secrets Manager
- [ ] Admin user created after first deploy (`npm run create-admin`)
- [ ] Default admin password changed in production
- [ ] ALB health checks passing on `/ping` (Fastify) and `/ai/status` or `/docs` (FastAPI)
- [ ] CloudFront error pages configured for SPA routing (403/404 → `index.html`)
- [ ] RDS not publicly accessible

---

## Related Docs

- [README.md](./README.md) — Monorepo overview
- [todo/README.md](./todo/README.md) — Frontend features, backend modes, shortcuts
- [DEPLOY.md](./DEPLOY.md) — Docker Hub publishing (legacy)
- [todo/FUN_STACK_PLAN.md](./todo/FUN_STACK_PLAN.md) — Fun & AI feature spec
- [todo-fast-api/README_IAM.md](./todo-fast-api/README_IAM.md) — PBAC / IAM architecture

---

**Next step:** Implement Phase 1 Dockerfiles and `.github/workflows/deploy.yml`, then provision AWS resources in Phase 2.
