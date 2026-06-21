# Phase 2 — AWS one-time setup

Step-by-step guide to provision AWS resources before CI/CD deploys work.

## Prerequisites

- AWS account with admin access (or sufficient IAM permissions)
- AWS CLI v2 configured (`aws configure`)
- Domain in Route 53 (optional but recommended for HTTPS)

Replace placeholders:

| Placeholder | Example |
| --- | --- |
| `ACCOUNT_ID` | `123456789012` |
| `AWS_REGION` | `us-east-1` |
| `GITHUB_ORG` | `Vaidiasri` |
| `GITHUB_REPO` | `google-keep-clone` |

---

## Step 1 — ECR + logs + secrets

```bash
cd infra/aws
export AWS_REGION=us-east-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
chmod +x setup-phase2.sh
./setup-phase2.sh
```

Save your ECR registry URL:

```
ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com
```

---

## Step 2 — RDS PostgreSQL

1. AWS Console → **RDS** → Create database
2. Engine: **PostgreSQL 15**
3. Template: Free tier / Dev
4. Instance: `db.t4g.micro`
5. **Public access: No**
6. VPC: same as ECS (default VPC OK for MVP)
7. Create database name: `todo`
8. After creation, update Secrets Manager `taskflow/prod`:

```json
{
  "DATABASE_URL": "postgresql://USER:PASSWORD@endpoint.rds.amazonaws.com:5432/todo",
  "JWT_SECRET": "long-random-string-same-on-both-backends",
  "GEMINI_API_KEY": "your-key"
}
```

**Security group:** allow inbound `5432` from the ECS tasks security group only.

---

## Step 3 — IAM roles for ECS

### Execution role (`taskflow-ecs-execution`)

Attach AWS managed policy: `AmazonECSTaskExecutionRolePolicy`

Add inline policy for Secrets Manager read on `taskflow/prod`:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["secretsmanager:GetSecretValue"],
    "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:taskflow/prod*"
  }]
}
```

### Task role (`taskflow-ecs-task`)

Minimal permissions for app runtime (optional for MVP — can use same as execution role).

---

## Step 4 — ECS task definitions

1. Copy templates:

```bash
cp infra/ecs/taskflow-fastify.json infra/ecs/taskflow-fastify.prod.json
cp infra/ecs/taskflow-fastapi.json infra/ecs/taskflow-fastapi.prod.json
```

2. Replace placeholders in both files:

| Placeholder | Value |
| --- | --- |
| `REPLACE_ECS_EXECUTION_ROLE_ARN` | `arn:aws:iam::ACCOUNT:role/taskflow-ecs-execution` |
| `REPLACE_ECS_TASK_ROLE_ARN` | `arn:aws:iam::ACCOUNT:role/taskflow-ecs-task` |
| `REPLACE_ECR_REGISTRY` | `ACCOUNT.dkr.ecr.REGION.amazonaws.com` |
| `REPLACE_AWS_REGION` | `us-east-1` |
| `REPLACE_CORS_ORIGINS` | `https://app.yourdomain.com` |
| `REPLACE_SECRET_*_ARN` | Secrets Manager ARN + key suffix (see below) |

**Secrets Manager ARN format** for individual keys in a JSON secret:

```
arn:aws:secretsmanager:us-east-1:123456789:secret:taskflow/prod-AbCdEf:DATABASE_URL::
```

3. Register:

```bash
aws ecs register-task-definition --cli-input-json file://infra/ecs/taskflow-fastify.prod.json
aws ecs register-task-definition --cli-input-json file://infra/ecs/taskflow-fastapi.prod.json
```

---

## Step 5 — ECS cluster + services + ALB

### Cluster

```bash
aws ecs create-cluster --cluster-name taskflow
```

### Application Load Balancer

1. Create ALB in your VPC (public subnets)
2. Target group **fastify-tg** → port `8080`, health check `/ping`
3. Target group **fastapi-tg** → port `8000`, health check `/health`
4. Listener rules (HTTPS :443):
   - Priority 1: path `/ai/*` → fastapi-tg
   - Default: → fastify-tg
5. ACM certificate for `api.yourdomain.com`

### ECS services (Fargate)

Create two services on cluster `taskflow`:

| Service | Task definition | Target group | Desired count |
| --- | --- | --- | --- |
| `taskflow-fastify` | taskflow-fastify | fastify-tg | 1 |
| `taskflow-fastapi` | taskflow-fastapi | fastapi-tg | 1 |

Networking: same VPC, private subnets with NAT (or public subnets for MVP), assign public IP if no NAT.

---

## Step 6 — Frontend (S3 + CloudFront)

1. Create S3 bucket `taskflow-frontend-prod` (block public access ON)
2. CloudFront OAC → allow S3 read
3. Default root object: `index.html`
4. Custom error responses: 403/404 → `/index.html` (SPA routing)
5. ACM cert for `app.yourdomain.com` (must be in `us-east-1` for CloudFront)
6. Route 53: `app.yourdomain.com` → CloudFront, `api.yourdomain.com` → ALB

---

## Step 7 — GitHub OIDC (no static AWS keys)

### 7a. Create OIDC provider (once per account)

AWS Console → IAM → Identity providers → Add provider:

- Type: OpenID Connect
- URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

### 7b. Create deploy role

1. Edit `infra/aws/github-oidc-trust-policy.json` — replace `ACCOUNT_ID`, `GITHUB_ORG`, `GITHUB_REPO`
2. Create role `taskflow-github-deploy` with that trust policy
3. Edit `infra/aws/github-deploy-policy.json` — replace placeholders
4. Attach as inline policy on the role

### 7c. GitHub repository configuration

**Secrets** (Settings → Secrets → Actions):

| Secret | Value |
| --- | --- |
| `AWS_ROLE_ARN` | `arn:aws:iam::ACCOUNT:role/taskflow-github-deploy` |
| `AWS_REGION` | `us-east-1` |
| `ECR_REGISTRY` | `ACCOUNT.dkr.ecr.us-east-1.amazonaws.com` |
| `VITE_API_URL_NODE` | `https://api.yourdomain.com` |
| `VITE_API_URL_PYTHON` | `https://api.yourdomain.com` |
| `S3_BUCKET` | `taskflow-frontend-prod` |
| `CLOUDFRONT_DIST_ID` | `E1234567890ABC` |

**Variables** (optional overrides):

| Variable | Default |
| --- | --- |
| `ECS_CLUSTER` | `taskflow` |
| `ECS_SERVICE_FASTIFY` | `taskflow-fastify` |
| `ECS_SERVICE_FASTAPI` | `taskflow-fastapi` |

---

## Step 8 — First deploy

Push to `main` or run the **Deploy to AWS** workflow manually (workflow_dispatch).

After deploy, create admin user against RDS:

```bash
cd todoBackend
$env:DATABASE_URL="postgresql://..."
npm run create-admin
```

---

## ALB routing reference

| Path | Backend |
| --- | --- |
| `/ai/*` | FastAPI :8000 |
| `/*` (default) | Fastify :8080 |

---

See also: [DEPLOY_AWS.md](../DEPLOY_AWS.md)
