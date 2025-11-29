# KIKA Backend

Tiny FastAPI backend that powers the KIKA desktop/web client. It manages user registration with email verification, password resets, metrics ingestion, and simple admin operations through both HTTP and a CLI.

## Features

- Email-first signup flow with optional passwords and verification links.
- Password reset via signed tokens.
- Metrics ingestion endpoint plus admin APIs to list users and events.
- Async SQLAlchemy 2.0 models backed by PostgreSQL and Alembic migrations.
- SMTP email delivery (Brevo in production, MailHog locally).
- Typer-based admin CLI for common maintenance tasks.

## Requirements

- Python 3.12+
- PostgreSQL 14+
- SMTP relay (e.g., Brevo, MailHog)

## Getting Started

1. **Install dependencies**

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

   > Prefer Poetry? Run `poetry install` instead.

2. **Configure environment**

   ```bash
   cp .env.sample .env
   ```

   Edit `.env` with your database URL, SMTP credentials, token secrets, and admin API key.

3. **Prepare the database**

   ```bash
   alembic upgrade head
   ```

4. **Run the API**

   ```bash
   uvicorn app:app --reload --port 8000
   ```

## Email Testing with MailHog

```bash
docker run -it --rm -p 8025:8025 -p 1025:1025 mailhog/mailhog
```

Then update `.env`:

- `SMTP_HOST=localhost`
- `SMTP_PORT=1025`
- `SMTP_USER=` (leave blank)
- `SMTP_PASS=` (leave blank)

Open http://localhost:8025 to inspect sent emails.

## Alembic Migrations

- Create new migration: `alembic revision --autogenerate -m "message"`
- Apply migrations: `alembic upgrade head`
- Rollback: `alembic downgrade -1`

## Admin CLI

Run commands with `python -m cli ...`:

- Create a user: `python -m cli create-user --email user@example.com --password changeme --verify`
- Deactivate: `python -m cli deactivate-user --email user@example.com`
- List users: `python -m cli list-users --limit 50`

## API Overview

- `POST /register` – register or update a user, send verification email.
- `GET /verify?token=...` – verify email tokens.
- `POST /login` – password login for verified users.
- `POST /password/forgot` & `/password/reset` – password reset flow.
- `GET /users/{email}` – public status lookup.
- `POST /metrics` – record usage metrics.
- `GET /healthz` – health probe.
- Admin endpoints (`X-Admin-Key` header required):
  - `POST /admin/users/create`
  - `POST /admin/users/deactivate`
  - `GET /admin/users/list`
  - `GET /admin/events/list`

## Docker

Build and run the container:

```bash
docker build -t kika-backend .
docker run --env-file .env -p 8000:80 kika-backend
```

The container listens on port 80 and uses Uvicorn to serve the FastAPI app. A health check hits `/healthz` to monitor readiness.
