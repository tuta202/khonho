# KhoNhỏ — Backend

FastAPI + SQLAlchemy + PostgreSQL

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs  
Health check: http://localhost:8000/health
