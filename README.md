# Odonta Index AI

AI-powered dental plaque analysis system for dental clinics. Automatically detects plaque from stained teeth photos, calculates hygiene indices, and generates professional PDF reports.

## Features

- **AI Plaque Detection** — YOLOv8 segmentation + OpenCV HSV fallback
- **5 Dental Indices** — Fedorov-Volodkina, API Lange, Green-Vermillion (OHI-S), Silness-Loe, PHP (Podshadley-Haley)
- **PDF Reports** — Professional reports with QR codes, visit calendar, and recommendations
- **YandexGPT Recommendations** — AI-generated hygiene recommendations (with template fallback)
- **Admin Dashboard** — Statistics, patient search, analysis history
- **Patient History** — Visit dynamics, plaque trend charts
- **Manual Correction** — Doctor can adjust AI results before final report
- **Share** — WhatsApp/Telegram share buttons, QR code for online report
- **Authentication** — JWT tokens, bcrypt passwords, rate limiting
- **Security** — File validation, path traversal protection, security headers

## Tech Stack

**Backend:** Python, FastAPI, SQLAlchemy, OpenCV, YOLOv8 (ultralytics), WeasyPrint, SQLite

**Frontend:** Next.js 16, React, TypeScript, Tailwind CSS, Framer Motion

**AI/ML:** YOLOv8n-seg (instance segmentation), OpenCV HSV color filtering

## Quick Start

### Backend

```bash
cd dental-ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python run.py
```

Backend runs on http://localhost:8000

### Frontend

```bash
cd frontend-next
npm install
npm run dev
```

Frontend runs on http://localhost:3000

### Docker

```bash
docker compose up --build
```

## Default Login

- **Username:** admin
- **Password:** admin123

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/dashboard` | Yes | Dashboard stats |
| POST | `/api/analyze` | Yes | Upload photos & analyze |
| GET | `/api/analysis/{id}` | Yes | Get analysis results |
| PUT | `/api/analysis/{id}/correct` | Yes | Edit results |
| GET | `/api/report/{id}/pdf` | No | Download PDF |
| GET | `/api/report/{id}/public` | No | Public report data |
| GET | `/api/patients/search?q=` | Yes | Search patients |
| GET | `/api/patients/{id}/history` | Yes | Patient visit history |
| GET | `/api/statistics` | Yes | Clinic statistics |

## Project Structure

```
dental-ai/
├── app/                        # FastAPI backend
│   ├── main.py                 # App entry, middleware, routers
│   ├── config.py               # Settings (env vars, HSV ranges)
│   ├── database.py             # SQLAlchemy setup
│   ├── models.py               # ORM models
│   ├── routers/                # API endpoints
│   │   ├── auth.py             # JWT auth, rate limiting
│   │   ├── analysis.py         # Photo upload & AI analysis
│   │   ├── corrections.py      # Manual result editing
│   │   ├── dashboard.py        # Dashboard stats
│   │   ├── patients.py         # Patient search & history
│   │   ├── reports.py          # PDF download & public report
│   │   └── statistics.py       # Clinic analytics
│   └── services/               # Business logic
│       ├── plaque_detector.py  # OpenCV + YOLO detection
│       ├── yolo_detector.py    # YOLOv8 segmentation
│       ├── index_calculator.py # 5 dental indices
│       ├── recommendations.py  # YandexGPT + templates
│       └── pdf_generator.py    # WeasyPrint PDF generation
├── frontend-next/              # Next.js frontend
│   └── src/app/
│       ├── login/              # Auth page with captcha
│       ├── dashboard/          # Stats overview
│       ├── analyze/            # Photo upload & results
│       ├── patients/           # Patient search & history
│       ├── statistics/         # Clinic analytics charts
│       └── report/[id]/        # Public report (QR)
├── templates/report/           # PDF HTML/CSS templates
├── tests/                      # 58 backend tests
├── ml/                         # YOLO training data & models
├── docker-compose.yml
├── Dockerfile.backend
└── Dockerfile.frontend
```

## Environment Variables

```
DATABASE_URL=sqlite:///./data/plaque.db
YANDEX_GPT_API_KEY=            # Optional: YandexGPT API key
YANDEX_GPT_FOLDER_ID=          # Optional: Yandex Cloud folder ID
SECRET_KEY=your-secret-key
```

## Developer

[pyaidev](https://kwork.ru/user/pyaidev)
