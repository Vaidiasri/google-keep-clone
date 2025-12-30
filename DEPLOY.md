# Docker Hub Deployment Guide

Follow these steps to publish your `todo` app to Docker Hub so anyone can pull and run it.

## Prerequisites

1.  **Docker Hub Account**: Create one at [hub.docker.com](https://hub.docker.com/).
2.  **Docker Desktop**: Running on your machine.

## Step 1: Login

Run this command in your terminal and enter your Docker Hub username and password/token.

```bash
docker login
```

## Step 2: Build & Tag Images

Replace `YOUR_USERNAME` with your actual Docker Hub username.

1.  **Build the images** (if not already built):

    ```bash
    docker-compose build
    ```

2.  **Tag Backend**:

    ```bash
    docker tag my-fastify-backend YOUR_USERNAME/my-fastify-backend:latest
    ```

3.  **Tag Frontend**:
    ```bash
    docker tag my-frontend YOUR_USERNAME/my-frontend:latest
    ```

## Step 3: Push Images

Upload them to Docker Hub.

1.  **Push Backend**:

    ```bash
    docker push YOUR_USERNAME/my-fastify-backend:latest
    ```

2.  **Push Frontend**:
    ```bash
    docker push YOUR_USERNAME/my-frontend:latest
    ```

## Step 4: How Others Can Use It

Anyone can now run your app using this `docker-compose.yml` (they need to create this file locally):

```yaml
version: "3.8"
services:
  backend:
    image: YOUR_USERNAME/my-fastify-backend:latest # <--- Updated image name
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/db # They need their own DB
      - JWT_SECRET=supersecret
    extra_hosts:
      - "host.docker.internal:host-gateway"

  frontend:
    image: YOUR_USERNAME/my-frontend:latest # <--- Updated image name
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:8080
```
