# EventX — Developer Guide (Copy‑Paste Ready)

## Project layout (standard)
```
/app/           # backend app (Django/Express/Flask — adapt to your stack)
  /models
  /views
  /serializers
  /tests
/frontend/      # React/Vue/Next.js front-end
  /components
  /pages
  /styles
/config/        # environment / deployment configs
scripts/        # helper scripts and utilities
README.md
```

## Getting started (local dev)
```
1. Copy .env.example -> .env and set values (DB, RAZORPAY keys, SECRET_KEY)
2. Install dependencies:
   - Backend: python -m pip install -r requirements.txt
   - Frontend: cd frontend && npm install
3. Run database migrations
4. Start backend server (e.g. python manage.py runserver)
5. Start frontend dev server (npm run dev)
```

## Environment variables (essential)
```
# Backend
SECRET_KEY=
DATABASE_URL=postgres://user:pass@localhost:5432/eventx
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
AWS_S3_BUCKET=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=
```

## API conventions
- Base path: /api/v1/
- Authentication: JWT in Authorization: Bearer <token>
- Pagination: use ?page= and ?page_size=
- Responses:
  - Success: { "status": "success", "data": ... }
  - Error: { "status": "error", "message": "..." }

## Tests
- Unit tests under app/tests/ (backend) and frontend/tests/.
- Run backend tests:
```
python manage.py test
```
- CI should run tests, lint, build frontend, and run security checks.

## Coding standards
- Use type hints (Python) / PropTypes or TypeScript (frontend)
- Linting: flake8 / eslint
- Commit messages: Conventional Commits (feat/fix/docs/chore)

## Database migrations
- Use Django migrations / Alembic / Sequelize migrations depending on stack.
- Always generate a migration after schema changes and review before deploy.

---
_Last updated: 2025-11-11