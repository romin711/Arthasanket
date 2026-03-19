## AI Investor Agent

Multi-agent stock and portfolio analysis system built with Python and FastAPI.

This project evaluates stocks using rule-based technical signals, portfolio context, and an explanation layer to produce practical actions like `Buy`, `Hold`, `Reduce`, `Avoid`, and `No Trade`.

## What It Does

- Analyzes stock trend, momentum, breakout behavior, and volume strength
- Evaluates portfolio sector concentration and overexposure
- Produces decision + confidence + confidence reason
- Generates human-readable assistant explanation
- Suggests next best action and alternatives
- Applies safety guardrails when market data quality is weak

## Architecture

Agents are separated by responsibility:

- `data_agent`: fetches market data (`yfinance`) and assigns `data_quality`
- `signal_agent`: generates technical signals from market data
- `decision_agent`: converts signals + portfolio context into action
- `portfolio_agent`: computes sector exposure, risk notes, and diversification suggestions
- `explanation_agent`: builds structured user-facing reasoning

Orchestration layers:

- `ai_investor_agent/workflow.py`: single-symbol workflow runner
- `ai_investor_agent/api_service.py`: portfolio-level service for API responses
- `api.py`: FastAPI app (`POST /analyze`)
- `main.py`: local CLI entrypoint

## Data Safety Guardrails

The pipeline uses:

- `data_quality = "valid" | "fallback" | "missing"`

Safety behavior:

- If `data_quality != "valid"`:
- Decision is forced to `Hold` or `No Trade`
- `Buy` and `Reduce` are blocked
- Confidence is capped at `<= 0.3`
- Explanation includes:
  `Data is incomplete or fallback-based, so no strong decision is made.`

This prevents confident decisions when data is invalid, incomplete, or fallback-based.

## Project Structure

```text
ai-investor-agent/
├── ai_investor_agent/
│   ├── agents/
│   │   ├── data_agent.py
│   │   ├── signal_agent.py
│   │   ├── decision_agent.py
│   │   ├── portfolio_agent.py
│   │   └── explanation_agent.py
│   ├── api_service.py
│   ├── workflow.py
│   └── types.py
├── api.py
├── main.py
└── README.md
```

## Quick Start

### 1) Create and activate virtual environment

```bash
python -m venv .venv
source .venv/bin/activate
```

### 2) Install dependencies

```bash
pip install fastapi uvicorn yfinance
```

## Run CLI Demo

```bash
python main.py --symbols AAPL,MSFT,RELIANCE.NS
```

This prints:

- Decision and allocation hint
- Confidence and reason
- Portfolio context
- Structured explanation sections

## Run API

```bash
uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

Open docs at:

- `http://127.0.0.1:8000/docs`

## API Contract

### Endpoint

- `POST /analyze`

### Request Body

```json
[
  { "symbol": "AAPL", "weight": 40 },
  { "symbol": "MSFT", "weight": 30 },
  { "symbol": "JPM", "weight": 30 }
]
```

### Response Highlights

For each stock result:

- `stock_data.price`, `stock_data.price_history`, `stock_data.data_warning`
- `signals.trend`, `signals.momentum_percent`, `signals.breakout`
- `signals.data_quality`
- `decision`, `confidence`, `confidence_reason`
- `explanation`, `next_action`, `alternatives`

Portfolio-level output:

- `sector_exposure`
- `overexposure`
- `overexposed_sectors`
- `diversification_suggestions`

## Decision Tiering (Bearish Separation)

The decision flow distinguishes bearish severity:

- `Avoid`: strong confirmed bearish setup
- `Reduce`: moderate weakness
- `Hold`: neutral/mixed conditions

This keeps risk actions explicit and avoids overlapping bearish rules.

## Notes

- This is a hackathon-style, rule-based prototype.
- It is not investment advice.
- Always validate with broader risk management, additional indicators, and live market checks.
