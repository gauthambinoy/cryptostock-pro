---
title: QuantumLedger
emoji: ⚛️
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
---

<div align="center">

# ⚛️ QuantumLedger

**Real-time stock and crypto portfolio tracker with AI-assisted market intelligence.**

[![CI/CD](https://github.com/gauthambinoy/quantum-ledger/actions/workflows/ci.yml/badge.svg)](https://github.com/gauthambinoy/quantum-ledger/actions)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Live Demo](https://cryptostock-pro.vercel.app) · [API Docs](#api-highlights) · [Run Locally](#quick-start) · [Deploy Free](#free-deployment)

</div>

---

## Why this project matters

QuantumLedger is built as a recruiter-ready fintech portfolio project: a full-stack, production-shaped app that tracks portfolios, watchlists, market movement, alerts, analytics, and AI-assisted insights across stocks and crypto.

It demonstrates:

- React + Vite + Tailwind UI with protected routes and reusable state stores.
- FastAPI backend with JWT/httpOnly-cookie auth, SQLAlchemy persistence, rate limiting, health checks, and Swagger docs.
- Real market integrations via yfinance, CoinGecko-style crypto data, NewsAPI, Alpha Vantage, Reddit/Twitter/FRED hooks, and optional Anthropic chat.
- Docker, Vercel, GitHub Actions, and Terraform deployment paths.

## Product highlights

| Area | What is implemented |
| --- | --- |
| Portfolio tracking | Multiple portfolios, holdings, performance, allocation, transactions, dividends, tax/export flows |
| Watchlist & alerts | Persisted user watchlists and price alerts backed by the database |
| Market data | Stock/crypto quotes, gainers/losers, history, comparison, converter, market pulse |
| Analytics | Risk analysis, correlation, rebalancing, DCA, backtesting, advanced charting indicators |
| AI/ML features | Prediction endpoints, chatbot integration, event signals, sentiment radar, smart-money views |
| Social/trading | Leaderboard, shareable portfolios, tournaments, rooms, trading panel prototypes |
| Production shape | Auth, CORS, security headers, request IDs, Docker health checks, CI workflow |

> Financial-data disclaimer: this is a software engineering portfolio project, not investment advice. Prediction and analytics features should be treated as educational/demo outputs unless independently validated.

## Demo and screenshots

- Live app: **https://cryptostock-pro.vercel.app**
- Backend health check: `/health`
- Swagger/OpenAPI docs: `/docs` when the backend is running

Recommended screenshots for a pinned GitHub repo:

1. Dashboard with portfolio cards and market overview.
2. Portfolio holdings table with gain/loss.
3. Watchlist or alerts workflow.
4. Advanced chart/backtester screen.

Place final images under `docs/screenshots/` and embed them here when ready:

```md
![Dashboard](docs/screenshots/dashboard.png)
![Portfolio](docs/screenshots/portfolio.png)
```

## Architecture

```text
quantum-ledger/
├── backend/                 # FastAPI + SQLAlchemy + pytest
│   ├── app/
│   │   ├── main.py          # App entry, middleware, routers, health checks
│   │   ├── auth.py          # JWT/httpOnly cookie auth
│   │   ├── database.py      # SQLite/PostgreSQL engine/session setup
│   │   ├── models.py        # User, portfolio, holding, watchlist, alert models
│   │   ├── routers/         # API modules: portfolio, market, watchlist, alerts, AI, trading
│   │   └── services/        # Market data, analytics, prediction, payments, notifications
│   └── tests/               # pytest test suite
├── frontend/                # React 18 + Vite + Tailwind
│   ├── src/pages/           # Feature pages
│   ├── src/components/      # Layout, charts, error boundaries, UI components
│   └── src/utils/           # API client and Zustand stores
├── mobile/                  # Expo React Native companion app
├── terraform/               # AWS deployment option
├── .github/workflows/ci.yml # Backend/frontend CI
├── Dockerfile               # Full-stack container
├── docker-compose.yml       # Local backend + Redis
└── vercel.json              # Vercel deployment config
```

## Data and persistence

- **Users/auth**: stored in SQLAlchemy models; auth uses JWT in httpOnly cookies.
- **Portfolios/holdings/transactions**: persisted per user in the configured database.
- **Watchlists/alerts**: persisted per user and enriched with live quote data at read time.
- **Local development database**: SQLite is supported (`sqlite:///./data/quantumledger.db`).
- **Production database**: PostgreSQL is recommended for multi-user deployments.
- **Cache/schedulers**: Redis and APScheduler support alerts, leaderboard updates, and background workflows.

## Quick start

### Option A: Docker

```bash
git clone https://github.com/gauthambinoy/quantum-ledger.git
cd quantum-ledger
cp backend/.env.example backend/.env

# Edit SECRET_KEY and ALLOWED_ORIGINS before production use.
docker compose up --build
```

Open:

- Frontend/API container: http://localhost:8000
- Health: http://localhost:8000/health
- API docs: http://localhost:8000/docs

### Option B: Run frontend and backend separately

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload
```

```bash
# Frontend
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Open the Vite dev server at http://localhost:3000.

## Environment variables

Backend settings live in `backend/.env.example`; frontend settings live in `frontend/.env.example`.

Required for production:

| Variable | Description |
| --- | --- |
| `SECRET_KEY` | Secure JWT signing key; use at least 32 random characters |
| `DATABASE_URL` | PostgreSQL URL in production, SQLite URL for local/demo |
| `ALLOWED_ORIGINS` | JSON list of trusted frontend origins, e.g. `["https://your-app.vercel.app"]` |

Optional integrations:

| Variable | Used for |
| --- | --- |
| `COINGECKO_API_KEY`, `ALPHA_VANTAGE_KEY`, `NEWSAPI_KEY`, `FRED_API_KEY` | Market/news/macro data rate limits |
| `ANTHROPIC_API_KEY` | AI chatbot |
| `SENDGRID_API_KEY`, `TWILIO_*` | Email/SMS alerts |
| `STRIPE_*` | Subscription/payment flows |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `TWITTER_BEARER_TOKEN` | Sentiment/social data |

## API highlights

```http
GET  /health
POST /api/auth/register
POST /api/auth/login/json
GET  /api/portfolio
POST /api/portfolio/{portfolio_id}/holdings
GET  /api/watchlist
POST /api/watchlist?symbol=BTC&asset_type=crypto
GET  /api/market/overview
GET  /api/prediction/{symbol}/advanced
GET  /api/portfolio-dna/{portfolio_id}
GET  /api/sentiment-radar/{symbol}
GET  /api/time-machine/simulate
```

Full interactive docs are available at `/docs` on a running backend.

## Validation

```bash
# Frontend
cd frontend
npm ci
npm run lint
npm test
npm run build

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt pytest pytest-asyncio pytest-cov
SECRET_KEY=test-secret DATABASE_URL=sqlite:///./test.db DEBUG=true python -m pytest tests/ -q
```

## Free deployment

### Vercel (current live-demo path)

1. Import the GitHub repo into Vercel.
2. Set project root to the repository root.
3. Keep the checked-in `vercel.json`.
4. Add environment variables:
   - `SECRET_KEY`
   - `DATABASE_URL`
   - `REDIS_URL` if using Redis-backed features
   - Optional API keys from `backend/.env.example`
5. Deploy and verify:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/health`

### Docker on a free/low-cost host

Use the included `Dockerfile` and set:

```bash
SECRET_KEY=...
DATABASE_URL=sqlite:///./data/quantumledger.db
ALLOWED_ORIGINS='["https://your-domain.example"]'
```

For real multi-user use, replace SQLite with a managed PostgreSQL database.

## Recruiter review checklist

- Open live demo and use guest/login flow.
- Show portfolio creation, holding tracking, watchlist, alerts, and analytics.
- Link directly to `/docs` for API design.
- Mention backend tests, frontend tests, CI, Docker, and deployment configuration in interviews.
- Add 3–4 screenshots to this README before pinning.

## License

MIT License — see [LICENSE](LICENSE).

---

<div align="center">

Built by [Gautham Binoy](https://github.com/gauthambinoy) · ⚛️ QuantumLedger

</div>
