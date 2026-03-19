# 🚀 AI Investor Agent

> Multi-agent stock + portfolio analysis system built for hackathons, demos, and rapid experimentation.

![Python](https://img.shields.io/badge/Python-3.x-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)
![Status](https://img.shields.io/badge/Status-Prototype-orange)
![Architecture](https://img.shields.io/badge/Architecture-Multi--Agent-purple)

---

## ✨ Highlights

- 📈 Signal analysis: trend, momentum, breakout, and volume strength
- 🧠 Rule-based decision engine: `Buy`, `Hold`, `Reduce`, `Avoid`, `No Trade`
- 🧩 Portfolio intelligence: sector exposure + overexposure detection
- 🗣️ Explanation engine: structured, human-readable reasoning
- 🛡️ Safety-first data handling with `data_quality` guardrails

---

## 🏗️ Architecture

### Agents

- `data_agent` → fetches market data and assigns quality status
- `signal_agent` → computes technical signals
- `decision_agent` → maps signals + portfolio context to actions
- `portfolio_agent` → analyzes sector concentration and diversification
- `explanation_agent` → generates assistant-style narrative output

### Orchestration

- `ai_investor_agent/workflow.py` → single symbol workflow
- `ai_investor_agent/api_service.py` → portfolio-level orchestration for API
- `api.py` → FastAPI app (`POST /analyze`)
- `main.py` → CLI demo entrypoint

---

## 🛡️ Data Safety Guardrails

`data_quality` is one of:

- `valid`
- `fallback`
- `missing`

If `data_quality != "valid"`:

- ✅ Action is forced to `Hold` or `No Trade`
- ⛔ `Buy` and `Reduce` are blocked
- 📉 Confidence is capped at `<= 0.3`
- 📝 Explanation includes:
  `Data is incomplete or fallback-based, so no strong decision is made.`

This keeps the system conservative when market data is unreliable.

---

## 📂 Project Structure

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

---

## ⚡ Quick Start

### 1. Create environment

```bash
python -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install fastapi uvicorn yfinance
```

### 3. Run CLI demo

```bash
python main.py --symbols AAPL,MSFT,RELIANCE.NS
```

### 4. Run API server

```bash
uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

Swagger UI:

- `http://127.0.0.1:8000/docs`

---

## 🔌 API

### Endpoint

`POST /analyze`

### Request example

```json
[
  { "symbol": "AAPL", "weight": 40 },
  { "symbol": "MSFT", "weight": 30 },
  { "symbol": "JPM", "weight": 30 }
]
```

### Response includes

- `stock_data.price`
- `stock_data.price_history`
- `stock_data.data_warning`
- `signals.trend`
- `signals.momentum_percent`
- `signals.breakout`
- `signals.data_quality`
- `decision`
- `confidence`
- `confidence_reason`
- `explanation`
- `next_action`
- `alternatives`
- portfolio-level `sector_exposure`, `overexposure`, and suggestions

---

## 📉 Bearish Decision Separation

Decision flow has clear bearish tiers:

- `Avoid` → strong bearish setup with confirmation
- `Reduce` → moderate weakness
- `Hold` → neutral/mixed conditions

This avoids overlap and makes risk intent clearer.

---

## 🧪 Demo Positioning

This project is a **rule-based prototype** designed for:

- hackathon demos
- architecture showcases
- rapid iteration on agentic workflows

It is not investment advice.

---

## 🤝 Contributing

Ideas to improve:

- add unit tests for decision scenarios
- improve dynamic sector mapping
- add backtesting/evaluation metrics
- add richer risk controls and constraints
