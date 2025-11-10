# EventX — Setup & Deployment Instructions (Copy‑Paste Ready)

## Prerequisites
- Python 3.10+ (or as required)
- Node.js 16+
- PostgreSQL 12+
- Redis (optional for caching)
- Docker & Docker Compose (recommended)

## Quick local setup
```
git clone <repo-url>
cd repo
cp .env.example .env
# edit .env with DB and keys
docker-compose up -d   # if docker-compose provided
# or run services manually
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
npm install --prefix frontend
npm run dev --prefix frontend
```

## Production deployment (recommended)
- Use Docker images, CI pipeline, and managed DB.
- Steps:
  1. Build Docker images for backend and frontend.
  2. Push to container registry.
  3. Deploy via Kubernetes / ECS / DigitalOcean App Platform.
  4. Set environment variables securely in deployment platform.
  5. Run migrations and collectstatic.
  6. Configure domain, HTTPS (Let's Encrypt).

## Backups & Monitoring
- Backup Postgres daily (pg_dump) and store in S3.
- Monitor with Prometheus/Grafana or a hosted monitoring provider.
- Set up alerts for failed jobs, high error rate, or low disk.

---
_Last updated: 2025-11-11