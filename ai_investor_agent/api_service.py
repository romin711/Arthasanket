"""Backend service layer for portfolio-level analysis."""

from __future__ import annotations

from typing import Any

from ai_investor_agent.agents import DataAgent
from ai_investor_agent.agents import DecisionAgent
from ai_investor_agent.agents import ExplanationAgent
from ai_investor_agent.agents import PortfolioAgent
from ai_investor_agent.agents import SignalAgent


class InvestorAnalysisService:
    """Runs the existing agent pipeline and returns API-friendly JSON."""

    def __init__(
        self,
        data_agent: DataAgent | None = None,
        signal_agent: SignalAgent | None = None,
        portfolio_agent: PortfolioAgent | None = None,
        decision_agent: DecisionAgent | None = None,
        explanation_agent: ExplanationAgent | None = None,
    ) -> None:
        self.data_agent = data_agent or DataAgent()
        self.signal_agent = signal_agent or SignalAgent()
        self.portfolio_agent = portfolio_agent or PortfolioAgent()
        self.decision_agent = decision_agent or DecisionAgent()
        self.explanation_agent = explanation_agent or ExplanationAgent()

    @staticmethod
    def normalize_portfolio(portfolio: list[dict[str, Any]]) -> list[dict[str, float | str]]:
        """Validate and normalize incoming portfolio payload."""
        normalized: list[dict[str, float | str]] = []

        for index, item in enumerate(portfolio):
            symbol = str(item.get("symbol", "")).strip().upper()
            raw_weight = item.get("weight")

            try:
                weight = float(raw_weight)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Row {index + 1}: invalid weight '{raw_weight}'.") from exc

            if not symbol:
                raise ValueError(f"Row {index + 1}: symbol is required.")
            if weight <= 0:
                raise ValueError(f"Row {index + 1}: weight must be positive.")

            normalized.append({"symbol": symbol, "weight": weight})

        if not normalized:
            raise ValueError("Portfolio must include at least one stock.")

        return normalized

    @staticmethod
    def _parse_explanation_sections(explanation: str) -> dict[str, list[str]]:
        sections = {
            "Why (Stock Analysis)": [],
            "Portfolio Insight": [],
            "Next Best Action": [],
            "Suggested Alternatives": [],
        }

        active_section: str | None = None
        for raw_line in explanation.splitlines():
            line = raw_line.strip()
            if not line:
                continue

            if line in sections:
                active_section = line
                continue

            if active_section is None:
                continue

            cleaned = line[2:].strip() if line.startswith("- ") else line
            sections[active_section].append(cleaned)

        return sections

    def analyze(self, portfolio: list[dict[str, Any]]) -> dict[str, Any]:
        """Analyze all symbols in portfolio and return full response JSON."""
        normalized_portfolio = self.normalize_portfolio(portfolio)
        symbols = [str(item["symbol"]).strip().upper() for item in normalized_portfolio]

        portfolio_context = self.portfolio_agent.analyze_portfolio(normalized_portfolio)
        live_data_map = self.data_agent.fetch_stock_data(symbols, portfolio=normalized_portfolio)

        results: list[dict[str, Any]] = []

        for symbol in symbols:
            live_data = live_data_map.get(symbol, {})

            market_data = self.data_agent.fetch(symbol, portfolio=normalized_portfolio)
            signal = self.signal_agent.analyze(
                market_data=market_data,
                current_volume=live_data.get("volume"),
                avg_volume=live_data.get("avg_volume"),
                portfolio_context=portfolio_context,
            )
            decision = self.decision_agent.decide(
                signal=signal,
                portfolio_context=portfolio_context,
                symbol=symbol,
            )
            explanation = self.explanation_agent.explain(
                trend=str(signal.get("trend", "neutral")),
                breakout=bool(signal.get("breakout", False)),
                volume_strength=str(signal.get("volume_strength", "normal")),
                momentum=float(signal.get("momentum_percent", 0.0)),
                decision=decision.action,
                data_quality=str(signal.get("data_quality", "valid")),
                next_action=decision.next_action,
                alternatives=decision.alternatives,
                symbol=symbol,
                portfolio_context=portfolio_context,
                volume_ratio=float(signal.get("volume_ratio", 1.0)),
            )

            sections = self._parse_explanation_sections(explanation)
            portfolio_insight_lines = sections.get("Portfolio Insight", [])
            portfolio_insight_text = " ".join(portfolio_insight_lines) if portfolio_insight_lines else ""

            price = live_data.get("price")
            if price is None:
                price = market_data.latest_price

            results.append(
                {
                    "symbol": symbol,
                    "stock_data": {
                        "price": round(float(price), 2),
                        "current_volume": live_data.get("volume"),
                        "avg_volume_5d": live_data.get("avg_volume"),
                        "price_history": [round(float(value), 2) for value in market_data.closing_prices],
                        "data_warning": market_data.data_warning or live_data.get("error"),
                    },
                    "signals": {
                        "trend": str(signal.get("trend", "neutral")),
                        "breakout": bool(signal.get("breakout", False)),
                        "momentum_percent": float(signal.get("momentum_percent", 0.0)),
                        "volume_strength": str(signal.get("volume_strength", "normal")),
                        "volume_ratio": float(signal.get("volume_ratio", 1.0)),
                        "data_quality": str(signal.get("data_quality", "valid")),
                    },
                    "decision": decision.action,
                    "confidence": decision.confidence_score,
                    "confidence_reason": decision.confidence_reason,
                    "explanation": explanation,
                    "portfolio_insight": portfolio_insight_text,
                    "next_action": decision.next_action,
                    "alternatives": decision.alternatives,
                }
            )

        return {
            "portfolio_insight": {
                "sector_exposure": portfolio_context.get("sector_exposure", {}),
                "overexposure": bool(portfolio_context.get("overexposure", False)),
                "overexposed_sectors": portfolio_context.get("overexposed_sectors", []),
                "diversification_suggestions": portfolio_context.get("diversification_suggestions", []),
            },
            "results": results,
        }
