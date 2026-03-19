"""Explanation agent: turns signals into a concise human explanation."""

from typing import Any

from ai_investor_agent.agents.portfolio_agent import PortfolioAgent


class ExplanationAgent:
    """Creates a structured, concise explanation behind the decision."""

    SECTOR_LABEL_OVERRIDES = {
        "RELIANCE.NS": "Energy/Refining",
    }
    HOLD_WATCHLIST_MAP = {
        "Financials": ["JPM", "HDFCBANK.NS"],
        "Energy": ["XOM", "RELIANCE.NS"],
        "Healthcare": ["JNJ", "SUNPHARMA.NS"],
        "Consumer": ["ITC.NS", "HINDUNILVR.NS"],
        "Technology": ["MSFT", "AAPL"],
        "IT": ["INFY.NS", "TCS.NS"],
    }

    def explain(
        self,
        trend: str,
        breakout: bool,
        volume_strength: str,
        momentum: float,
        decision: str,
        data_quality: str = "valid",
        next_action: str | None = None,
        alternatives: list[str] | None = None,
        symbol: str | None = None,
        portfolio_context: dict[str, Any] | None = None,
        volume_ratio: float | None = None,
    ) -> str:
        name = symbol or "This stock"

        why_line = self._why_summary(
            symbol_name=name,
            trend=trend,
            momentum=momentum,
            volume_strength=volume_strength,
            breakout=breakout,
        )
        portfolio_text = self._portfolio_reason(symbol, portfolio_context)
        alternative_lines = self._alternative_lines(
            alternatives=alternatives or [],
            portfolio_context=portfolio_context,
            decision=decision,
        )
        alternatives_title = "Suggested Alternatives (Optional)" if decision == "Hold" else "Suggested Alternatives"

        lines = [
            "Why (Stock Analysis)",
            f"- {why_line}",
        ]
        if data_quality != "valid":
            lines.append("- Data is incomplete or fallback-based, so no strong decision is made.")
        lines.extend(
            [
                "",
                "Portfolio Insight",
                f"- {portfolio_text}",
                "",
                "Next Best Action",
                f"- {next_action or f'Maintain the current {decision} stance and reassess after the next session.'}",
                "",
                alternatives_title,
            ]
        )

        if alternative_lines:
            lines.extend(f"- {line}" for line in alternative_lines)
        else:
            if decision == "Hold":
                lines.append("- No immediate rotation needed; keep a small watchlist for diversification.")
            else:
                lines.append("- No alternatives suggested for this setup.")

        return "\n".join(lines)

    @staticmethod
    def _trend_text(trend: str) -> str:
        if trend == "uptrend":
            return "an uptrend"
        if trend == "downtrend":
            return "a downtrend"
        return "a neutral phase"

    def _why_summary(
        self,
        symbol_name: str,
        trend: str,
        momentum: float,
        volume_strength: str,
        breakout: bool,
    ) -> str:
        trend_text = self._trend_text(trend)
        momentum_text = self._momentum_text(momentum)
        volume_text = self._volume_text(volume_strength)

        if trend == "neutral" and abs(momentum) < 1 and volume_strength == "low":
            conviction = "indicating weak conviction"
        elif trend in {"uptrend", "downtrend"} and abs(momentum) >= 2.5 and volume_strength == "high":
            conviction = "showing strong conviction"
        else:
            conviction = "indicating moderate conviction"

        range_note = (
            "Price is above its recent range."
            if breakout
            else "Price remains within its recent range."
        )

        return (
            f"{symbol_name} is in {trend_text} with {momentum_text} and {volume_text}, {conviction}. "
            f"{range_note}"
        )

    @staticmethod
    def _momentum_text(momentum: float) -> str:
        strength = abs(momentum)
        if strength < 1:
            return "minimal momentum"
        elif strength < 3:
            level = "moderate momentum"
        else:
            level = "strong momentum"

        if momentum > 0:
            return f"{level} to the upside"
        if momentum < 0:
            return f"{level} to the downside"
        return level

    @staticmethod
    def _portfolio_reason(
        symbol: str | None,
        portfolio_context: dict[str, Any] | None,
    ) -> str:
        if not symbol or not portfolio_context:
            return "Portfolio context is neutral for this call."

        normalized_symbol = symbol.strip().upper()
        symbol_sector_map = portfolio_context.get("symbol_sector_map", {})
        sector_exposure = portfolio_context.get("sector_exposure", {})

        if not isinstance(symbol_sector_map, dict) or not isinstance(sector_exposure, dict):
            return "Portfolio context is neutral for this call."

        sector = str(symbol_sector_map.get(normalized_symbol, "Other"))
        exposure = float(sector_exposure.get(sector, 0.0))
        overexposure = bool(portfolio_context.get("overexposure", False))

        if overexposure and exposure > 50:
            return (
                f"Portfolio is heavily tilted to {sector} ({exposure:.1f}%), so risk control should come first."
            )

        if exposure >= 35:
            return (
                f"{sector} exposure is already elevated at {exposure:.1f}%, so position changes should stay measured."
            )

        return f"{sector} exposure is balanced at {exposure:.1f}%, so concentration risk is limited."

    @staticmethod
    def _volume_text(volume_strength: str) -> str:
        if volume_strength == "high":
            return "high volume"
        if volume_strength == "low":
            return "low volume"
        return "normal volume"

    def _alternative_lines(
        self,
        alternatives: list[str],
        portfolio_context: dict[str, Any] | None,
        decision: str,
    ) -> list[str]:
        if decision == "Hold":
            return self._hold_optional_lines(alternatives, portfolio_context)

        if not alternatives:
            return []

        context = portfolio_context if isinstance(portfolio_context, dict) else {}
        sector_exposure = context.get("sector_exposure", {})
        overexposed = context.get("overexposed_sectors", [])
        symbol_sector_map = context.get("symbol_sector_map", {})

        if not isinstance(sector_exposure, dict):
            sector_exposure = {}
        if not isinstance(overexposed, list):
            overexposed = []
        if not isinstance(symbol_sector_map, dict):
            symbol_sector_map = {}

        underweighted = {
            str(sector)
            for sector, concentration in sector_exposure.items()
            if self._safe_float(concentration) < 15
        }
        dominant_geo = self._dominant_geography(symbol_sector_map)

        lines: list[str] = []
        used_reasons: set[str] = set()
        for alt in alternatives:
            normalized_alt = str(alt).strip().upper()
            alt_sector = str(
                symbol_sector_map.get(
                    normalized_alt,
                    PortfolioAgent.SECTOR_MAP.get(normalized_alt, "Other"),
                )
            )
            exposure = self._safe_float(sector_exposure.get(alt_sector, 0.0))
            alt_geo = self._symbol_geography(normalized_alt)
            base_market_label = self._market_label(dominant_geo)

            if alt_geo != dominant_geo:
                if alt_sector in underweighted:
                    reason = (
                        f"adds diversification beyond {base_market_label} while improving {alt_sector} balance."
                    )
                else:
                    reason = f"adds geographic diversification beyond {base_market_label}."
            elif alt_sector in underweighted:
                reason = f"improves sector balance within {base_market_label}."
            elif overexposed and alt_sector not in overexposed:
                reason = f"reduces concentration risk by adding {alt_sector} within {base_market_label}."
            else:
                reason = f"adds incremental diversification within {base_market_label}."

            if reason in used_reasons:
                reason = f"{reason[:-1]} and broadens stock-level diversification." if reason.endswith(".") else (
                    reason + " and broadens stock-level diversification."
                )
            used_reasons.add(reason)

            sector_label = self.SECTOR_LABEL_OVERRIDES.get(normalized_alt, alt_sector)
            lines.append(f"{normalized_alt} ({sector_label}): {reason}")

        return lines

    def _hold_optional_lines(
        self,
        alternatives: list[str],
        portfolio_context: dict[str, Any] | None,
    ) -> list[str]:
        context = portfolio_context if isinstance(portfolio_context, dict) else {}
        sector_exposure = context.get("sector_exposure", {})
        symbol_sector_map = context.get("symbol_sector_map", {})

        if not isinstance(sector_exposure, dict):
            sector_exposure = {}
        if not isinstance(symbol_sector_map, dict):
            symbol_sector_map = {}

        underweighted = [
            str(sector)
            for sector, concentration in sector_exposure.items()
            if self._safe_float(concentration) < 15
        ]

        if not underweighted and alternatives:
            derived_sectors: list[str] = []
            for alt in alternatives:
                normalized_alt = str(alt).strip().upper()
                sector = str(
                    symbol_sector_map.get(
                        normalized_alt,
                        PortfolioAgent.SECTOR_MAP.get(normalized_alt, "Other"),
                    )
                )
                if sector not in derived_sectors and sector != "Other":
                    derived_sectors.append(sector)
            underweighted = derived_sectors

        if not underweighted:
            return []

        lines: list[str] = []
        used_symbols: set[str] = set()

        for index, sector in enumerate(underweighted[:2]):
            example_symbol = self._pick_hold_example_symbol(
                sector=sector,
                alternatives=alternatives,
                symbol_sector_map=symbol_sector_map,
                used_symbols=used_symbols,
            )
            if not example_symbol:
                continue
            used_symbols.add(example_symbol)

            if index == 0:
                lines.append(f"Monitor {sector} (e.g., {example_symbol}) for stability.")
            elif index == 1:
                lines.append(
                    f"Consider {sector} (e.g., {example_symbol}) for diversification if trend weakens."
                )
            else:
                lines.append(f"Watchlist {sector} names such as {example_symbol} for optional diversification.")

        return lines

    def _pick_hold_example_symbol(
        self,
        sector: str,
        alternatives: list[str],
        symbol_sector_map: dict[str, Any],
        used_symbols: set[str],
    ) -> str:
        for alt in alternatives:
            normalized_alt = str(alt).strip().upper()
            if not normalized_alt or normalized_alt in used_symbols:
                continue
            alt_sector = str(
                symbol_sector_map.get(
                    normalized_alt,
                    PortfolioAgent.SECTOR_MAP.get(normalized_alt, "Other"),
                )
            )
            if alt_sector == sector:
                return normalized_alt

        for candidate in self.HOLD_WATCHLIST_MAP.get(sector, []):
            normalized_candidate = str(candidate).strip().upper()
            if normalized_candidate and normalized_candidate not in used_symbols:
                return normalized_candidate

        return ""

    @staticmethod
    def _symbol_geography(symbol: str) -> str:
        normalized = symbol.strip().upper()
        if normalized.endswith(".NS"):
            return "India"
        return "US"

    def _dominant_geography(self, symbol_sector_map: dict[str, Any]) -> str:
        geo_count = {"US": 0, "India": 0}
        for symbol in symbol_sector_map.keys():
            symbol_geo = self._symbol_geography(str(symbol))
            geo_count[symbol_geo] = geo_count.get(symbol_geo, 0) + 1
        return "India" if geo_count.get("India", 0) > geo_count.get("US", 0) else "US"

    @staticmethod
    def _market_label(geo: str) -> str:
        return "Indian markets" if geo == "India" else "US markets"

    @staticmethod
    def _safe_float(value: Any) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0
