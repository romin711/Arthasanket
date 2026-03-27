# AI Investor Agent

Portfolio-aware decision intelligence for Indian equities.

## Overview

AI Investor Agent is a full-stack project with:
- a Node.js backend decision engine (`backend/`)
- a React frontend dashboard (`frontend/`)
- an older Python prototype (`api.py`, `main.py`, `ai_investor_agent/`)

Given a portfolio, it fetches market data, computes technical/fundamental context, and returns explainable decision signals plus opportunity alerts.

## Core Features

- Portfolio analysis with BUY/HOLD/SELL recommendations
- Opportunity Radar workflow with alert ranking and run history
- Validation endpoints (hit rate, CI, drawdown, Sharpe, baseline comparison)
- Financial context endpoints (health score, events, insider/news helpers)
- Market summary and financial headlines endpoints
- Local persistence for radar history and synchronized outcomes

## Tech Stack

- Backend: Node.js HTTP server
- Frontend: React + `react-scripts`
- Market data: Yahoo Finance integrations
- Optional external data: NewsAPI (`NEWSAPI_KEY`)

## Project Structure

```text
ai-investor-agent/
├── backend/
│   ├── server.js
│   ├── engine/
│   ├── storage/
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   └── package.json
├── ai_investor_agent/
├── api.py
├── main.py
└── README.md
```

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

Install dependencies:

```bash
npm --prefix ./backend install
npm --prefix ./frontend install
```

Backend env (`backend/.env`):

```env
PORT=3001
HOST=127.0.0.1
GEMINI_API_KEY=
NEWSAPI_KEY=
```

Frontend optional env (`frontend/.env`):

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:3001
```

## Run

Start backend:

```bash
npm --prefix ./backend start
```

Start frontend:

```bash
npm --prefix ./frontend start
```

Default URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:3001`

## Test

Backend tests:

```bash
npm --prefix ./backend test
```

Frontend tests:

```bash
npm --prefix ./frontend test -- --watchAll=false --runInBand
```

Focused Opportunity Radar test:

```bash
npm --prefix ./frontend run test:radar
```

## API Endpoints

### Health

- `GET /health`

### Portfolio and Radar

- `POST /api/portfolio/analyze`
- `POST /api/agent/opportunity-radar`
- `GET /api/agent/opportunity-radar/history?limit=25`

Payload accepted by the two POST routes:
- array rows: `[{ "symbol": "TCS", "weight": 40 }]`
- object with `portfolio` array or object map
- object with `rawInput` text

### Validation

- `GET /api/validation/performance`
- `GET /api/validation/strategy-breakdown`
- `GET /api/validation/outcomes`

### Market Intel

- `GET /api/market/summary`
- `GET /api/news/financial?limit=5`

### Financial Data

- `GET /api/financial/health?symbol=TCS`
- `GET /api/financial/events?symbol=TCS`
- `GET /api/financial/signal?symbol=TCS&price=2400`
- `GET /api/financial/insider?symbol=TCS`
- `GET /api/financial/news?symbol=TCS`

## Quick cURL Examples

Portfolio analyze:

```bash
curl -X POST http://127.0.0.1:3001/api/portfolio/analyze \
  -H "Content-Type: application/json" \
  -d '[
    {"symbol":"RELIANCE","weight":40},
    {"symbol":"TCS","weight":35},
    {"symbol":"INFY","weight":25}
  ]'
```

Opportunity radar:

```bash
curl -X POST http://127.0.0.1:3001/api/agent/opportunity-radar \
  -H "Content-Type: application/json" \
  -d '[
    {"symbol":"TCS","weight":40},
    {"symbol":"RELIANCE","weight":35}
  ]'
```

Validation performance:

```bash
curl "http://127.0.0.1:3001/api/validation/performance"
```

## Notes

- There is no root `package.json`, so use `npm --prefix ./backend ...` and `npm --prefix ./frontend ...` from repo root.
- `NEWSAPI_KEY` is optional; the backend still runs without it.

## License

No explicit license file is currently present.
