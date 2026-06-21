#!/usr/bin/env bash
# One-time AWS setup for TaskFlow (Phase 2)
# Usage: AWS_REGION=us-east-1 ACCOUNT_ID=123456789 ./setup-phase2.sh

set -euo pipefail

: "${AWS_REGION:?Set AWS_REGION (e.g. us-east-1)}"
: "${ACCOUNT_ID:?Set ACCOUNT_ID}"

echo "==> Creating ECR repositories..."
for repo in taskflow-fastify taskflow-fastapi taskflow-frontend; do
  aws ecr describe-repositories --repository-names "$repo" --region "$AWS_REGION" 2>/dev/null \
    || aws ecr create-repository --repository-name "$repo" --region "$AWS_REGION"
  echo "    ✓ $repo"
done

echo "==> Creating CloudWatch log groups..."
for lg in /ecs/taskflow-fastify /ecs/taskflow-fastapi; do
  aws logs create-log-group --log-group-name "$lg" --region "$AWS_REGION" 2>/dev/null || true
  echo "    ✓ $lg"
done

echo "==> Creating Secrets Manager secret (placeholder — update values in console)..."
SECRET_NAME="taskflow/prod"
if ! aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" 2>/dev/null; then
  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "TaskFlow production secrets" \
    --secret-string '{"DATABASE_URL":"postgresql://user:pass@host:5432/todo","JWT_SECRET":"change-me","GEMINI_API_KEY":""}' \
    --region "$AWS_REGION"
  echo "    ✓ Created $SECRET_NAME — update values in AWS Console!"
else
  echo "    ✓ $SECRET_NAME already exists"
fi

echo ""
echo "==> Done. Next steps:"
echo "  1. Update secret: taskflow/prod (DATABASE_URL, JWT_SECRET, GEMINI_API_KEY)"
echo "  2. Create RDS PostgreSQL in the same VPC as ECS"
echo "  3. Fill in infra/ecs/*.json placeholders and register task definitions"
echo "  4. Create ECS cluster 'taskflow', services, and ALB (see infra/README.md)"
echo "  5. Configure GitHub OIDC role (infra/aws/github-oidc-trust-policy.json)"
echo ""
echo "ECR registry: ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
