# ECS task definitions

Templates for Fargate services. **Replace all `REPLACE_*` placeholders** before the first GitHub Actions deploy.

## Required placeholders

| Placeholder | Example |
| --- | --- |
| `REPLACE_ECS_EXECUTION_ROLE_ARN` | `arn:aws:iam::123456789012:role/taskflow-ecs-execution` |
| `REPLACE_ECS_TASK_ROLE_ARN` | `arn:aws:iam::123456789012:role/taskflow-ecs-task` |
| `REPLACE_ECR_REGISTRY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| `REPLACE_AWS_REGION` | `us-east-1` |
| `REPLACE_CORS_ORIGINS` | `https://app.yourdomain.com` |
| `REPLACE_SECRET_DATABASE_URL_ARN` | `arn:aws:secretsmanager:...:secret:taskflow/prod-xxx:DATABASE_URL::` |
| `REPLACE_SECRET_JWT_ARN` | `...:JWT_SECRET::` |
| `REPLACE_SECRET_GEMINI_ARN` | `...:GEMINI_API_KEY::` |

The deploy workflow updates only the container **image** tag; all other fields come from these JSON files.

See [infra/README.md](../README.md) for full AWS setup steps.
