"""Decision agent: maps signal quality into an action recommendation."""

from typing import Any

from ai_investor_agent.types import TradeDecision


class DecisionAgent:
    """Uses a lightweight scoring model for practical hackathon decisions."""

    UNDERWEIGHT_THRESHOLD = 15.0
    SECTOR_ALTERNATIVES = {
        "Financials": ["JPM", "HDFCBANK.NS", "ICICIBANK.NS"],
        "Energy": ["XOM", "RELIANCE.NS", "ONGC.NS"],
        "Healthcare": ["JNJ", "SUNPHARMA.NS", "DRREDDY.NS"],
        "Consumer": ["ITC.NS", "HINDUNILVR.NS"],
        "Technology": ["MSFT", "AAPL", "GOOGL"],
    }

    def decide(
        self,
        signal: dict[str, str | bool | float | None],
        portfolio_context: dict[str, Any] | None = None,
        symbol: str | None = None,
    ) -> TradeDecision:
        data_quality = str(signal.get("data_quality", "valid"))
        if data_quality != "valid":
            action = "No Trade" if data_quality == "missing" else "Hold"
            confidence_score = 0.2 if data_quality == "missing" else 0.3
            confidence_reason = "Data is incomplete or fallback-based, so no strong decision is made."
            return TradeDecision(
                action=action,
                confidence_score=confidence_score,
                confidence_reason=confidence_reason,
                allocation_hint="none" if action == "No Trade" else "small",
                risk_note="Rule-based prototype only; wait for valid market data before any trade execution.",
                next_action="Wait for reliable live data and re-run analysis.",
                alternatives=[],
            )

        trend = str(signal.get("trend", "neutral"))
        breakout = bool(signal.get("breakout", False))
        volume_strength = str(signal.get("volume_strength", "normal"))
        momentum = float(signal.get("momentum_percent", 0.0))

        # 1) Build a combined score from multiple signals.
        score = 0.0

        if trend == "uptrend":
            score += 0.35
        elif trend == "downtrend":
            score -= 0.35

        if breakout:
            score += 0.25

        # Momentum contribution is capped to avoid extreme swings.
        momentum_component = max(-0.25, min(0.25, momentum / 12))
        score += momentum_component

        # 2) Volume strength adjusts conviction.
        if volume_strength == "low":
            score *= 0.60
        elif volume_strength == "high":
            score *= 1.08

        # 3) Portfolio concentration penalty (reduces overreaction).
        portfolio_note = ""
        sector_name, sector_weight = self._sector_context(symbol, portfolio_context)
        if sector_weight > 50:
            score -= 0.25
            portfolio_note = (
                f"Portfolio already has high exposure to {sector_name} ({sector_weight:.1f}%)."
            )
        elif sector_weight >= 35:
            score -= 0.10
            portfolio_note = (
                f"Portfolio already has meaningful exposure to {sector_name} ({sector_weight:.1f}%)."
            )

        overexposed = bool(portfolio_context.get("overexposure", False)) if portfolio_context else False
        weak_signals = self._is_weak_signal_profile(
            trend=trend,
            momentum=momentum,
            breakout=breakout,
            volume_strength=volume_strength,
        )
        reduce_setup = self._is_reduce_setup(
            trend=trend,
            momentum=momentum,
            breakout=breakout,
            volume_strength=volume_strength,
        )
        avoid_setup = self._is_avoid_setup(
            trend=trend,
            momentum=momentum,
            breakout=breakout,
            volume_strength=volume_strength,
        )

        # 4) Decision policy with anti-overreaction guardrails.
        if trend == "neutral" and abs(momentum) < 1.0:
            action = "Hold"
            allocation_hint = "small"
        elif score >= 0.45 and trend == "uptrend":
            action = "Buy"
            allocation_hint = "medium"
        elif avoid_setup:
            action = "Avoid"
            allocation_hint = "minimal"
        elif reduce_setup:
            action = "Reduce"
            allocation_hint = "reduce"
        elif overexposed and weak_signals:
            action = "Light Reduce"
            allocation_hint = "light_reduce"
        else:
            action = "Hold"
            allocation_hint = "small"

        # 5) Confidence (0-1) from signal agreement and score strength.
        bullish_votes = int(trend == "uptrend") + int(breakout) + int(momentum > 0)
        bearish_votes = int(trend == "downtrend") + int(momentum < 0)
        agreement = max(bullish_votes, bearish_votes) / 3
        confidence_score = 0.45 + 0.35 * abs(score) + 0.20 * agreement
        if volume_strength == "low":
            confidence_score *= 0.88
        elif volume_strength == "high":
            confidence_score *= 1.05
        if sector_weight >= 35:
            confidence_score *= 0.90
        if action == "Light Reduce":
            confidence_score = min(confidence_score, 0.72)
        elif action == "Hold" and abs(momentum) < 1.5:
            confidence_score = min(confidence_score, 0.62)
        confidence_score = min(1.0, round(confidence_score, 2))
        confidence_reason = self._build_confidence_reason(
            trend=trend,
            momentum=momentum,
            breakout=breakout,
            volume_strength=volume_strength,
            confidence_score=confidence_score,
        )

        risk_note = (
            "Rule-based prototype only; validate with broader indicators and risk limits before trading."
        )
        if portfolio_note:
            risk_note = f"{risk_note} {portfolio_note}"

        next_action, alternatives = self._next_best_action(
            action=action,
            symbol=symbol,
            portfolio_context=portfolio_context,
        )

        return TradeDecision(
            action=action,
            confidence_score=confidence_score,
            confidence_reason=confidence_reason,
            allocation_hint=allocation_hint,
            risk_note=risk_note,
            next_action=next_action,
            alternatives=alternatives,
        )

    @staticmethod
    def _build_confidence_reason(
        trend: str,
        momentum: float,
        breakout: bool,
        volume_strength: str,
        confidence_score: float,
    ) -> str:
        if volume_strength == "low" and trend == "neutral":
            return "Low volume and lack of strong trend reduce signal reliability."

        if trend in {"uptrend", "downtrend"} and abs(momentum) >= 2.5 and volume_strength == "high":
            return "Strong trend and high volume confirm the signal."

        if confidence_score <= 0.55:
            return "Mixed signals keep confidence low, so reliability is limited."

        if breakout and trend == "uptrend":
            return "Breakout with an uptrend improves signal confirmation."

        if trend == "downtrend" and momentum <= -2.5:
            return "Downtrend and negative momentum provide meaningful downside confirmation."

        return "Signals are partially aligned, so confidence is moderate."

    @staticmethod
    def _is_weak_signal_profile(
        trend: str,
        momentum: float,
        breakout: bool,
        volume_strength: str,
    ) -> bool:
        return (
            trend in {"neutral", "downtrend"}
            and abs(momentum) < 1.5
            and not breakout
            and volume_strength != "high"
        )

    @staticmethod
    def _is_reduce_setup(
        trend: str,
        momentum: float,
        breakout: bool,
        volume_strength: str,
    ) -> bool:
        # Moderate weakness: bearish trend, negative momentum, but not a high-conviction selloff.
        moderate_negative_momentum = -3.5 < momentum <= -1.5
        return trend == "downtrend" and moderate_negative_momentum and not breakout

    @staticmethod
    def _is_avoid_setup(
        trend: str,
        momentum: float,
        breakout: bool,
        volume_strength: str,
    ) -> bool:
        # Strong bearish case: confirmed downside with heavy participation.
        strong_downtrend = trend == "downtrend" and momentum <= -3.5
        bearish_confirmation = volume_strength == "high" and not breakout
        return strong_downtrend and bearish_confirmation

    @staticmethod
    def _sector_context(
        symbol: str | None,
        portfolio_context: dict[str, Any] | None,
    ) -> tuple[str, float]:
        if not symbol or not portfolio_context:
            return "Unknown", 0.0

        normalized_symbol = symbol.strip().upper()
        symbol_sector_map = portfolio_context.get("symbol_sector_map", {})
        sector_exposure = portfolio_context.get("sector_exposure", {})

        if not isinstance(symbol_sector_map, dict) or not isinstance(sector_exposure, dict):
            return "Unknown", 0.0

        sector_name = str(symbol_sector_map.get(normalized_symbol, "Other"))
        sector_weight = float(sector_exposure.get(sector_name, 0.0))
        return sector_name, sector_weight

    def _next_best_action(
        self,
        action: str,
        symbol: str | None,
        portfolio_context: dict[str, Any] | None,
    ) -> tuple[str, list[str]]:
        default_next_steps = {
            "Buy": "Accumulate in small tranches with stop-loss discipline.",
            "Hold": "Wait for stronger confirmation before changing allocation.",
            "No Trade": "Wait for reliable live data before taking a position.",
            "Light Reduce": "Trim only part of exposure and reassess after the next confirmation candle.",
            "Reduce": "Trim position size and reassess on the next signal update.",
            "Avoid": "Avoid new exposure until trend and volume improve.",
        }

        if not portfolio_context:
            return default_next_steps.get(action, "Monitor and rebalance as needed."), []

        sector_exposure = portfolio_context.get("sector_exposure", {})
        overexposed_sectors_raw = portfolio_context.get("overexposed_sectors", [])
        overexposed_sectors = (
            [str(sector) for sector in overexposed_sectors_raw]
            if isinstance(overexposed_sectors_raw, list)
            else []
        )
        underweighted_sectors = self._find_underweighted_sectors(
            sector_exposure=sector_exposure,
            overexposed_sectors=overexposed_sectors,
        )

        if action == "Hold":
            hold_alternatives = self._select_alternatives(
                symbol=symbol,
                portfolio_context=portfolio_context,
                target_sectors=underweighted_sectors,
            )
            return default_next_steps.get(action, "Monitor and rebalance as needed."), hold_alternatives

        if action not in {"Avoid", "Reduce", "Light Reduce"} or not bool(portfolio_context.get("overexposure", False)):
            return default_next_steps.get(action, "Monitor and rebalance as needed."), []

        underweighted_sectors = self._find_underweighted_sectors(
            sector_exposure=sector_exposure,
            overexposed_sectors=overexposed_sectors,
        )
        alternatives = self._select_alternatives(
            symbol=symbol,
            portfolio_context=portfolio_context,
            target_sectors=underweighted_sectors,
        )

        top_overexposed_sector = (
            overexposed_sectors[0] if overexposed_sectors else self._sector_context(symbol, portfolio_context)[0]
        )
        next_action = (
            f"Rebalance portfolio by reducing {top_overexposed_sector} exposure"
        )
        return next_action, alternatives

    def _find_underweighted_sectors(
        self,
        sector_exposure: Any,
        overexposed_sectors: list[str],
    ) -> list[str]:
        normalized_exposure = sector_exposure if isinstance(sector_exposure, dict) else {}
        excluded = set(overexposed_sectors)
        exposure_candidates = [str(sector) for sector in normalized_exposure.keys() if str(sector) not in excluded]
        mapping_only_candidates = [
            str(sector)
            for sector in self.SECTOR_ALTERNATIVES.keys()
            if str(sector) not in excluded and str(sector) not in exposure_candidates
        ]

        # First prefer sectors already present in portfolio exposure data.
        underweighted_from_exposure: list[str] = []
        for sector in exposure_candidates:
            concentration = normalized_exposure.get(sector, 0.0)
            try:
                weight = float(concentration)
            except (TypeError, ValueError):
                weight = 0.0
            if weight < self.UNDERWEIGHT_THRESHOLD:
                underweighted_from_exposure.append(sector)
        if underweighted_from_exposure:
            return underweighted_from_exposure[:3]

        weighted_sectors: list[tuple[str, float]] = []
        for sector in mapping_only_candidates:
            concentration = normalized_exposure.get(sector, 0.0)
            try:
                weight = float(concentration)
            except (TypeError, ValueError):
                weight = 0.0
            weighted_sectors.append((sector, weight))

        weighted_sectors.sort(key=lambda item: item[1])
        underweighted = [
            sector for sector, weight in weighted_sectors if weight < self.UNDERWEIGHT_THRESHOLD
        ]
        if underweighted:
            return underweighted[:3]

        return [sector for sector, _ in weighted_sectors[:3]]

    def _select_alternatives(
        self,
        symbol: str | None,
        portfolio_context: dict[str, Any],
        target_sectors: list[str],
    ) -> list[str]:
        normalized_symbol = symbol.strip().upper() if symbol else ""
        alternatives: list[str] = []

        symbol_sector_map = portfolio_context.get("symbol_sector_map", {})
        if isinstance(symbol_sector_map, dict):
            for sector in target_sectors:
                for portfolio_symbol, mapped_sector in symbol_sector_map.items():
                    candidate = str(portfolio_symbol).strip().upper()
                    if (
                        str(mapped_sector) == sector
                        and candidate
                        and candidate != normalized_symbol
                        and candidate not in alternatives
                    ):
                        alternatives.append(candidate)
                    if len(alternatives) >= 2:
                        return alternatives

        for sector in target_sectors:
            for candidate in self.SECTOR_ALTERNATIVES.get(sector, []):
                normalized_candidate = str(candidate).strip().upper()
                if (
                    normalized_candidate
                    and normalized_candidate != normalized_symbol
                    and normalized_candidate not in alternatives
                ):
                    alternatives.append(normalized_candidate)
                if len(alternatives) >= 2:
                    return alternatives

        return alternatives[:2]
