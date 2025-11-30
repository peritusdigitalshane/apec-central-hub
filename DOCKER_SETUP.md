# Docker Setup Guide

## Prerequisites
- Docker installed on your system
- Docker Compose (optional, for easier management)

## Building the Docker Image

```bash
docker build -t apec-central .
```

## Running the Container

### Option 1: Using Docker directly
```bash
docker run -d -p 8080:80 --name apec-central apec-central
```

### Option 2: Using Docker Compose (recommended)
```bash
docker-compose up -d
```

## Accessing the Application
Once running, access the application at: `http://localhost:8080`

## Managing the Container

### View logs
```bash
docker logs apec-central
# or with docker-compose
docker-compose logs -f
```

### Stop the container
```bash
docker stop apec-central
# or with docker-compose
docker-compose down
```

### Restart the container
```bash
docker restart apec-central
# or with docker-compose
docker-compose restart
```

## Important Notes

1. **Environment Variables**: The Supabase connection details are built into the application at build time from the `.env` file. Make sure your `.env` file is properly configured before building.

2. **Production Deployment**: For production, consider:
   - Using a reverse proxy (like Traefik or nginx) with SSL/TLS
   - Setting up proper monitoring and logging
   - Implementing backup strategies
   - Using container orchestration (Kubernetes, Docker Swarm)

3. **Updating the Application**: To deploy updates:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```
