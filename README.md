# Arthsanket (AI Investor Agent)

Arthsanket is a multi-component investment intelligence platform for portfolio-aware decision support.

It combines:
- A Node.js backend for Opportunity Radar, Market Chat, validation analytics, and financial signal APIs.
- A React frontend dashboard for portfolio tracking, insights, market chat, validation, and charts.
- A Python multi-agent engine and FastAPI service for stock analysis workflows.

The project is designed around Indian market use cases while still supporting generic symbols where available from upstream data providers.

## Core Capabilities

- Portfolio-aware stock analysis and action recommendations.
- Opportunity Radar scans for candidate signals and alerts.
- Market Chat assistant with session memory and prediction/outcome tracking.
- Validation and readiness metrics using synchronized live outcomes.
- Financial health/event/news/insider APIs.
- Optional synthetic backtest generation for demo environments.
- Adaptive scoring modules in backend engine codebase.

## Repository Structure

```text
.
├── ai_investor_agent/          # Python multi-agent engine (data/signal/decision/explanation/portfolio)
├── api.py                      # FastAPI service for Python agent pipeline
├── main.py                     # Python CLI entrypoint
├── backend/                    # Node.js backend (HTTP APIs + engine services + tests)
│   ├── server.js
│   ├── engine/
│   ├── routes/
│   ├── tests/
│   ├── storage/
│   └── .env.example
├── frontend/                   # React dashboard app
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
└── validate-refactoring.sh     # Convenience validation script for backend checks
```

## Tech Stack

- Backend API: Node.js (built-in HTTP server)
- Frontend: React (Create React App), React Router, Axios, Lightweight Charts
- Python API: FastAPI + Pydantic
- Python market data: yfinance
- AI integration (Node backend): Gemini/OpenAI env-configurable hooks
- Storage: JSON file-based local persistence for sessions/outcomes/history

## Quick Start

## 1. Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+
- Optional API keys:
  - GEMINI_API_KEY
  - OPENAI_API_KEY
  - NEWSAPI_KEY

## 2. Clone and install

```bash
git clone https://github.com/romin711/ai-investor-agent.git
cd ai-investor-agent

cd backend
npm install

cd ../frontend
npm install

cd ..
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn yfinance
```

## 3. Configure environment files

### Backend env
Create backend/.env from backend/.env.example:

```env
PORT=3001
HOST=127.0.0.1
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
NEWSAPI_KEY=
USE_MOCK_FINANCIAL_DATA=false
RADAR_AUTORUN_ENABLED=false
RADAR_AUTORUN_INTERVAL_MINUTES=720
RADAR_AUTORUN_RISK_PROFILE=moderate
RADAR_AUTORUN_UNIVERSE_LIMIT=0
NSE_UNIVERSE_FILE=
```

### Frontend env
Create frontend/.env from frontend/.env.example:

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:3001
```

## 4. Run services

Use three terminals.

### Terminal A: Node backend

```bash
cd backend
npm start
```

Backend listens on:
- http://127.0.0.1:3001 (default)

### Terminal B: React frontend

```bash
cd frontend
npm start
```

Frontend runs on:
- http://localhost:3000

### Terminal C: Python FastAPI (optional)

```bash
source .venv/bin/activate
uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

Python API listens on:
- http://127.0.0.1:8000

## 5. Python CLI analysis (optional)

```bash
source .venv/bin/activate
python main.py --symbols AAPL,MSFT,RELIANCE.NS
```

## Frontend Routes

The frontend app defines these routes:

- /dashboard
- /portfolio
- /charts
- /insights
- /market-chat
- /opportunity-radar
- /validation-dashboard
- /settings

## Node Backend API Reference

Base URL: http://127.0.0.1:3001

## Health

- GET /health

## Stock and portfolio analysis

- GET /api/stock/:symbol
- POST /api/portfolio/analyze

Accepted portfolio payload formats for /api/portfolio/analyze include:
- Array rows: [{"symbol":"TCS","weight":40}, ...]
- Object map: {"TCS":40,"INFY":60}
- Raw text via rawInput (CSV/space separated rows)

## Opportunity Radar

- POST /api/agent/opportunity-radar
- POST /api/agent/opportunity-radar/universe
- GET /api/agent/opportunity-radar/history?limit=25

Scheduler controls:
- GET /api/agent/opportunity-radar/scheduler
- POST /api/agent/opportunity-radar/scheduler/start
- POST /api/agent/opportunity-radar/scheduler/stop
- POST /api/agent/opportunity-radar/scheduler/run-now

## Validation and outcomes

- GET /api/validation/performance
- GET /api/validation/readiness
- GET /api/validation/strategy-breakdown
- GET /api/validation/outcomes

## Market summary and news

- GET /api/market/summary
- GET /api/news/financial?limit=5

## Market Chat

- POST /api/agent/market-chat
- GET /api/agent/market-chat/session?sessionId=...

## Financial signal APIs

- GET /api/financial/health?symbol=RELIANCE
- GET /api/financial/events?symbol=RELIANCE
- GET /api/financial/signal?symbol=RELIANCE&price=2500
- GET /api/financial/insider?symbol=RELIANCE
- GET /api/financial/news?symbol=RELIANCE

## Synthetic backtest (disabled by default)

- POST /api/backtest/run

Requires backend env:
- ENABLE_SYNTHETIC_BACKTEST=true

## FastAPI (Python) API Reference

Base URL: http://127.0.0.1:8000

- GET /
  - Basic service info and endpoint pointers
- POST /analyze
  - Body: list of portfolio items [{"symbol":"AAPL","weight":30}, ...]
- POST /portfolio/save
  - Body: {"user_id":"default-user","portfolio":[...]}
- GET /portfolio/load?user_id=default-user
- GET /realtime/quotes?symbols=AAPL,MSFT,GOOGL

## Example Requests

### Analyze portfolio (Node backend)

```bash
curl -X POST http://127.0.0.1:3001/api/portfolio/analyze \
  -H "Content-Type: application/json" \
  -d '[{"symbol":"RELIANCE","weight":40},{"symbol":"TCS","weight":60}]'
```

### Opportunity radar by universe

```bash
curl -X POST http://127.0.0.1:3001/api/agent/opportunity-radar/universe \
  -H "Content-Type: application/json" \
  -d '{"riskProfile":"moderate","universeLimit":25}'
```

### Market Chat question

```bash
curl -X POST http://127.0.0.1:3001/api/agent/market-chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What should I reduce in my portfolio this week?"}'
```

### Python API analyze

```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '[{"symbol":"AAPL","weight":30},{"symbol":"MSFT","weight":70}]'
```

## Testing

### Backend tests

```bash
cd backend
npm test
```

### Frontend tests

```bash
cd frontend
npm test
```

### Validation helper script

```bash
./validate-refactoring.sh
```

## Data and Persistence Notes

- Backend uses local JSON files in backend/storage for outcomes/sessions/history.
- Python API persists saved portfolios in ai_investor_agent/storage/portfolio_store.json.
- This setup is suitable for local development and hackathon demos.
- For production, replace file storage with managed persistent storage and add authentication.

## Operational Notes

- CORS is open by default in both backend services for local development.
- Portfolio payload validation is strict for required symbol and positive weight.
- If backend port is busy, set PORT to another value in backend env.
- If financial/news providers are unavailable, response quality depends on configured fallbacks.

## Troubleshooting

- Frontend cannot connect:
  - Verify backend is running at REACT_APP_API_BASE_URL.
- Empty or missing market data:
  - Check symbol format accepted by upstream providers.
- Market chat quality is degraded:
  - Ensure GEMINI_API_KEY (or configured provider key) is set.
- Backtest endpoint returns 403:
  - Set ENABLE_SYNTHETIC_BACKTEST=true only in demo/testing.

## Disclaimer

This project is for educational, research, and prototyping use.
It is not financial advice. Always perform independent research and risk assessment before trading.
