# KhoNhỏ — Quản lý kho hàng

Ứng dụng quản lý kho hàng cho cửa hàng nhỏ.

## Stack
- **Frontend**: React 18 + Vite + TailwindCSS → Vercel
- **Backend**: FastAPI + SQLAlchemy 2.0 → Railway
- **Database**: PostgreSQL → Railway
- **Auth**: JWT (access 8h / refresh 7d), roles: owner / staff

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### 1. Clone & setup backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/khonho
SECRET_KEY=change-me-to-a-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173
```

```bash
# Run migrations + seed data
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health

### 2. Setup frontend

```bash
cd frontend
npm install
cp .env.example .env
```

`frontend/.env` (default):
```
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

- App: http://localhost:5173

---

## Seed Data

After running `alembic upgrade head`, the following default account is created:

| Field    | Value               |
|----------|---------------------|
| Email    | admin@khonho.com    |
| Password | Admin@123           |
| Role     | owner               |
| Name     | Administrator       |

Also seeded: warehouse **"Kho chính"** (id=1).

---

## Deploy

### Backend → Railway

1. Create a new Railway project
2. Add a **PostgreSQL** service — copy the `DATABASE_URL`
3. Add a **Web Service** pointing to the `backend/` directory
4. Set environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | from Railway PostgreSQL |
| `SECRET_KEY` | long random string (e.g. `openssl rand -hex 32`) |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |
| `CORS_ORIGINS` | your Vercel frontend URL |

The `railway.toml` in `backend/` configures the build automatically:
```
startCommand: alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
healthcheckPath: /health
```

### Frontend → Vercel

1. Import the repo in Vercel
2. Set **Root Directory** to `frontend`
3. Set environment variable:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | your Railway backend URL (no trailing slash) |

The `vercel.json` handles SPA routing rewrites automatically.

---

## Project Structure

```
khonho/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # Route handlers
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── core/          # Security utilities
│   │   ├── config.py      # Settings (pydantic-settings)
│   │   ├── database.py    # Engine + SessionLocal + Base
│   │   ├── dependencies.py # get_db, get_current_user, require_owner
│   │   └── main.py        # FastAPI app entry
│   ├── alembic/           # Migrations
│   ├── railway.toml       # Railway deploy config
│   ├── Procfile           # Fallback process config
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/    # Layout, guards, UI primitives
    │   ├── pages/         # Route-level pages
    │   ├── services/      # Axios API wrappers
    │   └── stores/        # Zustand state (auth)
    └── vercel.json        # Vercel SPA rewrite config
```
