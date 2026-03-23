<div align="center">

# 🤖 AI Investor Agent

### Your portfolio. Analyzed in seconds. Explained in plain English.

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Recharts](https://img.shields.io/badge/Recharts-Charting-0F172A?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://recharts.org/)
[![yfinance](https://img.shields.io/badge/yfinance-Live%20Data-8B5CF6?style=for-the-badge&logo=yahoo&logoColor=white)](https://pypi.org/project/yfinance/)
[![Status](https://img.shields.io/badge/Status-Prototype-F59E0B?style=for-the-badge)](https://github.com/romin711/ai-investor-agent)

<br/>

> **Submit your portfolio → get per-stock decisions with confidence scores, plain-language reasoning, and sector diversification insights — in real time. No API keys. No black box.**

</div>

---

## 📋 Table of Contents

- [🧠 Overview](#-overview)
- [❗ Problem Statement](#-problem-statement)
- [💡 Solution](#-solution)
- [✨ Key Features](#-key-features)
- [🏗️ Architecture](#️-architecture)
- [🔄 System Flow](#-system-flow)
- [📊 Dashboard Highlights](#-dashboard-highlights)
- [⚡ Quick Start](#-quick-start)
- [🔌 API Contract](#-api-contract)
- [🎯 Decision Logic](#-decision-logic)
- [🛡️ Safety & Data Guardrails](#️-safety--data-guardrails)
- [🏆 What Makes It Different](#-what-makes-it-different)
- [🎬 Demo Flow](#-demo-flow)
- [📁 Project Structure](#-project-structure)
- [⚠️ Disclaimer](#️-disclaimer)
- [👨‍💻 Author](#-author)

---

## 🧠 Overview

**AI Investor Agent** is a full-stack, multi-agent stock analysis platform. Drop in a weighted portfolio — tickers and allocation percentages — and five specialized agents cooperate to deliver per-symbol trade recommendations backed by live market data, technical signals, and sector concentration context.

No external AI service is required. All intelligence runs locally: live prices and volume are pulled from Yahoo Finance via `yfinance`, passed through deterministic signal and scoring rules, and rendered in a React dashboard or printed to the terminal.

---

## ❗ Problem Statement

Retail investors face a consistent set of frustrations:

- **Information overload** — raw charts and data, no clear action
- **No portfolio context** — single-stock tools ignore what you already own
- **Opaque decisions** — black-box platforms give ratings with zero explanation
- **Fragmented workflow** — separate tools for data, analysis, and portfolio management
- **Jargon-heavy output** — signals that require expertise to interpret

Most tools tell you *what* the market is doing. None tell you *what to do about it* given your specific holdings.

---

## 💡 Solution

AI Investor Agent replaces a fragmented, opaque analysis workflow with a single request:

1. **Submit** your portfolio (tickers + weights) via the dashboard or API.
2. **Five agents** fetch live data, compute signals, assess your sector exposure, score a decision, and write a plain-English explanation — all in one pipeline.
3. **Receive** a confidence-scored action (`Buy`, `Hold`, `Reduce`, `Avoid`, `No Trade`) with a human-readable reason, next-step guidance, and alternative symbols to consider.

Everything happens in seconds, requires no sign-up, and the logic is fully transparent and auditable.

---

## ✨ Key Features

| Feature | Details |
|---|---|
| 🔄 **Multi-agent pipeline** | Five decoupled agents cooperate: Data → Portfolio → Signal → Decision → Explanation |
| 📈 **Live market data** | Prices and 5-day volume fetched in real time via `yfinance`; graceful fallback when data is missing |
| 🧠 **Technical signal analysis** | Trend direction, 5-day momentum %, breakout detection, and volume conviction |
| 🏦 **Portfolio-aware decisions** | Sector exposure, overconcentration detection, and diversification suggestions baked into every recommendation |
| 🎯 **Confidence-scored actions** | Six possible actions (`Buy` · `Hold` · `Light Reduce` · `Reduce` · `Avoid` · `No Trade`) each with a 0–1 confidence score |
| 💬 **Plain-language explanations** | Every decision comes with a structured rationale — no jargon |
| 📊 **React dashboard** | Finance-style card layout, 7 trading-day price sparkline, confidence bar, dark/light theme |
| ⚡ **FastAPI backend** | Auto-documented REST API at `/docs`, CORS-ready |
| 🖥️ **CLI mode** | Full analysis from the terminal — no UI required |
| 🌏 **Global symbol support** | US equities, NSE/BSE (`.NS`), and any other `yfinance`-compatible market |

---

## 🏗️ Architecture

The system is built as a **sequential multi-agent pipeline**. Each agent has a single responsibility and passes its output downstream.

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                        │
│   React Dashboard (Port 3000)    CLI (main.py)         │
└─────────────────┬───────────────────────┬───────────────┘
                  │  POST /analyze        │  --symbols flag
                  ▼                       ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend (Port 8000)             │
│                                                         │
│  ┌─────────────┐   ┌──────────────────┐                │
│  │  DataAgent  │   │  PortfolioAgent  │                │
│  │  (yfinance) │   │  (sector map)    │                │
│  └──────┬──────┘   └────────┬─────────┘                │
│         │                   │                           │
│         └─────────┬─────────┘                          │
│                   ▼                                     │
│          ┌────────────────┐                             │
│          │  SignalAgent   │                             │
│          │ trend·momentum │                             │
│          │ breakout·volume│                             │
│          └───────┬────────┘                             │
│                  ▼                                      │
│         ┌────────────────┐                              │
│         │ DecisionAgent  │                              │
│         │ score · action │                              │
│         │  · confidence  │                              │
│         └───────┬────────┘                              │
│                 ▼                                       │
│       ┌──────────────────┐                              │
│       │ ExplanationAgent │                              │
│       │  why · next step │                              │
│       │  · alternatives  │                              │
│       └────────┬─────────┘                              │
│                │  Structured JSON                       │
└────────────────┼────────────────────────────────────────┘
                 ▼
        Dashboard / Terminal
```

**Agent responsibilities at a glance:**

| Agent | Responsibility |
|---|---|
| `DataAgent` | Fetches live closing prices (last 7 trading days) and current + 5-day average volume |
| `PortfolioAgent` | Maps holdings to sectors, calculates exposure %, flags overconcentration |
| `SignalAgent` | Computes trend, momentum %, breakout flag, volume strength, and volume ratio |
| `DecisionAgent` | Scores combined signals, applies portfolio penalties, outputs action + confidence |
| `ExplanationAgent` | Assembles a structured plain-English summary with next steps and alternatives |

---

## 🔄 System Flow

**Step-by-step for a single portfolio submission:**

```
1. User submits:  [{ "symbol": "AAPL", "weight": 40 }, { "symbol": "JPM", "weight": 60 }]

2. DataAgent      →  fetches last 7 trading-day close prices + volume for each symbol
                     fallback series used if yfinance returns no data

3. PortfolioAgent →  Technology: 40% | Financials: 60%
                     overexposure: false (no sector > 50%)

4. SignalAgent    →  AAPL: uptrend | momentum +2.7% | breakout: true | volume: high
                     JPM:  neutral  | momentum +0.3% | breakout: false | volume: normal

5. DecisionAgent  →  AAPL: trend(+0.35) + breakout(+0.25) + momentum(+0.23) → raw 0.83, × 1.08 (high vol) = 0.89 → BUY (confidence: 0.78)
                     JPM:  momentum near zero, no breakout → HOLD (confidence: 0.56)

6. ExplanationAgent → structured rationale + next action + alternatives per symbol

7. Response JSON  →  rendered as cards in the React dashboard
```

---

## 📊 Dashboard Highlights

The React dashboard is the fastest way to use the system. Open it at `http://localhost:3000` after starting both servers.

**Input panel:**
- Accepts plain-text format (`AAPL 40`) or raw JSON array
- Validates and normalises weights automatically
- Supports multi-symbol portfolios with tabbed navigation

**Per-symbol card:**

| Element | What it shows |
|---|---|
| 💰 **Price + Trend** | Current close price · `uptrend` / `downtrend` / `neutral` badge |
| 📉 **Momentum %** | 5-day price change percentage |
| 📈 **Price sparkline** | Last 7 trading-day close-price line chart (Recharts) with dynamic Y-axis padding |
| 🧠 **Decision badge** | Colour-coded: 🟢 Buy · 🟡 Hold · 🔴 Reduce / Avoid |
| 📊 **Confidence bar** | Animated fill bar showing 0–100% confidence |
| 💡 **Next action** | Contextual follow-up guidance |
| 🔄 **Alternatives** | Alternative symbols with sector labels for rebalancing |

**Portfolio panel:**
- Top sector exposure summary (e.g. `Technology 70% (Overexposed)`)
- Live overexposure warnings

**Theme:**
- One-click dark/light mode toggle
- CSS custom properties for consistent theming

---

## ⚡ Quick Start

### Prerequisites

| Tool | Min. version | Purpose |
|---|---|---|
| [Python](https://python.org) | 3.10 | Backend runtime |
| [Node.js](https://nodejs.org) | 18 LTS | React frontend |
| [npm](https://www.npmjs.com/) | 9+ | Frontend package manager |
| Internet access | — | Live data via `yfinance` |

### 1 — Clone

```bash
git clone https://github.com/romin711/ai-investor-agent.git
cd ai-investor-agent
```

### 2 — Backend

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install fastapi "uvicorn[standard]" pydantic yfinance

# Start the API server
uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

| URL | Description |
|---|---|
| `http://127.0.0.1:8000` | Health check (`GET /`) |
| `http://127.0.0.1:8000/docs` | Interactive Swagger UI |
| `http://127.0.0.1:8000/analyze` | Analysis endpoint (`POST`) |

### 3 — Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

### 4 — CLI (no UI required)

```bash
# Single symbol
python main.py --symbols AAPL

# Multi-symbol
python main.py --symbols AAPL,MSFT,RELIANCE.NS
```

---

## 🔌 API Contract

### `GET /`

Health check.

```json
{
  "message": "AI Investor Agent API is running.",
  "analyze_endpoint": "POST /analyze"
}
```

---

### `POST /analyze`

**Request** — array of portfolio items:

```json
[
  { "symbol": "AAPL", "weight": 40 },
  { "symbol": "MSFT", "weight": 30 },
  { "symbol": "JPM",  "weight": 30 }
]
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `symbol` | `string` | ✅ | Any Yahoo Finance ticker (`AAPL`, `RELIANCE.NS`, …) |
| `weight` | `number` | ✅ | Positive value; normalised to % internally |

**Response:**

```json
{
  "portfolio_insight": {
    "sector_exposure": { "Technology": 70.0, "Financials": 30.0 },
    "overexposure": true,
    "overexposed_sectors": ["Technology"],
    "diversification_suggestions": ["Trim exposure in Technology; keep each sector closer to 20-35%."]
  },
  "results": [
    {
      "symbol": "AAPL",
      "stock_data": {
        "price": 214.22,
        "current_volume": 53210000,
        "avg_volume_5d": 49120000,
        "price_history": [208.5, 209.1, 210.8, 212.3, 214.22],
        "data_warning": null
      },
      "signals": {
        "trend": "uptrend",
        "breakout": true,
        "momentum_percent": 2.73,
        "volume_strength": "high",
        "volume_ratio": 1.08,
        "data_quality": "valid"
      },
      "decision": "Buy",
      "confidence": 0.78,
      "confidence_reason": "Strong trend and high volume confirm the signal.",
      "next_action": "Accumulate in small tranches with stop-loss discipline.",
      "alternatives": ["XOM", "JNJ"]
    }
  ]
}
```

**Error codes:**

| Status | Cause |
|---|---|
| `422 Unprocessable Entity` | Missing symbol, invalid weight, empty portfolio |
| `500 Internal Server Error` | Unexpected backend error |

---

## 🎯 Decision Logic

The `DecisionAgent` builds a composite score from four signal inputs, then maps it to an action and confidence level.

```
Score = trend_weight + breakout_bonus + momentum_cap

  trend_weight    = +0.35 (uptrend) | 0 (neutral) | −0.35 (downtrend)
  breakout_bonus  = +0.25 if price breaks above 5-day high
  momentum_cap    = clamped to [−0.25, +0.25] from (momentum_pct / 12)

Score is then adjusted:
  × 1.08  if volume_strength = "high"
  × 0.60  if volume_strength = "low"
  − 0.25  if sector exposure > 50%   (overconcentration penalty)
  − 0.10  if sector exposure ≥ 35%   (elevated exposure penalty)

Action mapping:
  score ≥ 0.45 + uptrend          → Buy
  neutral + |momentum| < 1%        → Hold
  downtrend + momentum ≤ −3.5% + high volume → Avoid
  downtrend + −3.5% < momentum ≤ −1.5%        → Reduce
  overexposed + weak signals        → Light Reduce
  data_quality = "missing"          → No Trade

Confidence = 0.45 + 0.35 × |score| + 0.20 × signal_agreement
  Capped at 1.0; adjusted down for low volume or high sector concentration.
```

---

## 🛡️ Safety & Data Guardrails

The system is built to fail gracefully and never produce a confident recommendation from bad data.

**Data quality levels:**

| Level | Meaning | Effect on pipeline |
|---|---|---|
| `valid` | Full OHLCV data returned by yfinance | Normal signal + decision computation |
| `fallback` | Partial data (e.g. < 5 days of volume) | Signals computed with caveats; confidence reduced |
| `missing` | No data returned (invalid/delisted symbol) | Action forced to `No Trade`; confidence = 0.2 |

**Anti-overreaction guardrails:**

- **Momentum is capped** at ±0.25 contribution regardless of magnitude — prevents extreme swings from driving decisions alone.
- **Low-volume signals** are penalised: score multiplied by 0.60, confidence multiplied by 0.88.
- **Sector overconcentration** reduces both score and confidence — the system will not recommend aggressively buying into an already-heavy sector.
- **`Light Reduce` confidence** is capped at 0.72 to reflect inherent uncertainty in mild repositioning signals.
- **`Hold` confidence** is capped at 0.62 when momentum is weak — the system does not pretend certainty where none exists.
- **Fallback price series** are deterministically generated (not random) from the ticker string, so the pipeline always completes without crashing.

**Input validation:**

- All portfolio items are validated before processing: symbol must be non-empty, weight must be positive.
- Empty or fully-invalid portfolios return a `422` error immediately.

---

## 🏆 What Makes It Different

Most stock-analysis tools do one thing: show you signals. This system does something harder — it tells you what to do about those signals **given your actual portfolio**.

| Typical analysis tool | AI Investor Agent |
|---|---|
| Single-stock view | Analyses your whole portfolio at once |
| Raw signals (RSI, MACD) | Human-readable decision with confidence score |
| No context | Sector exposure + overconcentration penalties built in |
| Black-box rating | Fully transparent, auditable scoring formula |
| Requires API keys or subscriptions | Runs entirely locally with `yfinance` |
| Crashes on bad data | Graceful fallback at every data quality level |
| One output format | Dashboard UI + REST API + CLI |

The differentiating design decision: **the Decision Agent knows what you own**. A `Buy` signal on a stock in a sector you're already 55% exposed to will be down-scored and flagged — something most tools simply ignore.

---

## 🎬 Demo Flow

Here is the fastest way to see the full system in action:

**Step 1 — Start the backend**
```bash
source .venv/bin/activate
uvicorn api:app --reload --port 8000
```

**Step 2 — Start the frontend**
```bash
cd frontend && npm start
```

**Step 3 — Open the dashboard**

Navigate to `http://localhost:3000`. You'll see the input panel pre-filled with an example portfolio.

**Step 4 — Submit the portfolio**

The default input is:
```
AAPL 40
MSFT 30
GOOGL 30
```
> All three are Technology sector stocks, so this portfolio has 100% Technology concentration.

Click **Analyze**. Within a few seconds, results appear for each symbol.

**Step 5 — Explore the output**

- Click between symbol tabs (`AAPL`, `MSFT`, `GOOGL`) to see per-stock cards.
- Check the portfolio insight bar: with 100% Technology allocation, an **Overexposed** warning appears.
- Observe that `Buy` confidence is reduced on all three symbols due to the sector overconcentration penalty.
- Toggle to **dark mode** with the button in the top-right corner.

**Step 6 — Try a diversified portfolio**

Update the input to:
```
AAPL 30
JPM 30
XOM 20
JNJ 20
```

Re-analyze. Confidence scores increase, overexposure warning disappears, and `Reduce` / `Avoid` actions may appear if any symbol is in a downtrend.

**Step 7 — Try the CLI**
```bash
python main.py --symbols AAPL,JPM,XOM,JNJ
```

The same pipeline runs in the terminal, printing signal summaries, decisions, and explanations for each symbol.

---

## 📁 Project Structure

```text
ai-investor-agent/
├── ai_investor_agent/              # Core Python package
│   ├── agents/
│   │   ├── __init__.py             # Package exports
│   │   ├── data_agent.py           # Live price & volume fetching (yfinance)
│   │   ├── signal_agent.py         # Trend, momentum, breakout, volume signals
│   │   ├── portfolio_agent.py      # Sector exposure & concentration analysis
│   │   ├── decision_agent.py       # Action + confidence scoring engine
│   │   └── explanation_agent.py    # Plain-language reasoning output
│   ├── api_service.py              # InvestorAnalysisService (used by FastAPI)
│   ├── workflow.py                 # MultiAgentStockAnalyzer orchestrator
│   └── types.py                    # Shared dataclasses (MarketData, TradeDecision …)
├── api.py                          # FastAPI app entry point
├── main.py                         # CLI entry point
├── frontend/                       # React dashboard
│   ├── src/
│   │   ├── App.js                  # Root component
│   │   ├── App.css                 # Finance-style global styles
│   │   └── components/
│   │       └── PortfolioAnalyzer.js  # Main UI: input, cards, chart, theme
│   ├── public/
│   └── package.json
└── README.md
```

---

## ⚠️ Disclaimer

> This project is a **rule-based prototype** built for learning, demos, and experimentation.
>
> - It is **not financial advice**.
> - Do **not** invest real money based on its output.
> - Market data accuracy depends on `yfinance` and Yahoo Finance availability.
> - The scoring model is intentionally simple — it does not account for earnings, macro factors, options flow, or fundamental analysis.
> - Always consult a qualified financial advisor before making any investment decision.

---

## 👨‍💻 Author

**Romin** — [@romin711](https://github.com/romin711)

Built as a full-stack multi-agent demonstration project combining real-time market data, a deterministic decision engine, and a React portfolio dashboard.

---

<div align="center">

⭐ If you find this useful, consider giving it a star on GitHub!

</div>
