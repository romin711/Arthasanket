"""Signal agent: creates simple, meaningful trading signals."""

from ai_investor_agent.types import MarketData


class SignalAgent:
    """Computes trend, breakout, volume strength, and momentum."""

    def analyze(
        self,
        market_data: MarketData,
        current_volume: int | None = None,
        avg_volume: float | None = None,
        portfolio_context: dict[str, object] | None = None,
    ) -> dict[str, str | bool | float | None]:
        data_quality = str(getattr(market_data, "data_quality", "valid"))
        data_warning = getattr(market_data, "data_warning", None)

        if data_quality != "valid":
            return {
                "trend": "neutral",
                "breakout": False,
                "volume_strength": "normal",
                "volume_ratio": 1.0,
                "momentum_percent": 0.0,
                "data_quality": data_quality,
                "data_warning": str(data_warning) if data_warning else None,
            }

        prices = market_data.closing_prices
        if len(prices) < 2:
            return {
                "trend": "neutral",
                "breakout": False,
                "volume_strength": "normal",
                "volume_ratio": 1.0,
                "momentum_percent": 0.0,
                "data_quality": "fallback",
                "data_warning": "Insufficient price points for robust signal generation.",
            }

        # Momentum: use the available window; prioritize last 5 days when possible.
        momentum_window = prices[-5:] if len(prices) >= 5 else prices
        start_price = momentum_window[0]
        end_price = momentum_window[-1]
        momentum_percent = 0.0
        if start_price != 0:
            momentum_percent = ((end_price - start_price) / start_price) * 100

        # Trend: based on the last 5-day movement.
        if momentum_percent > 1.0:
            trend = "uptrend"
        elif momentum_percent < -1.0:
            trend = "downtrend"
        else:
            trend = "neutral"

        # Breakout: current price above the high of previous 5 days.
        lookback_prices = prices[-6:-1] if len(prices) >= 6 else prices[:-1]
        five_day_high = max(lookback_prices) if lookback_prices else end_price
        breakout = end_price > five_day_high

        # Volume strength: ratio-based classification for cleaner conviction signals.
        if current_volume is None or avg_volume is None or avg_volume <= 0:
            volume_ratio = 1.0
            volume_strength = "normal"
        else:
            volume_ratio = current_volume / avg_volume
            if volume_ratio >= 1.20:
                volume_strength = "high"
            elif volume_ratio < 0.80:
                volume_strength = "low"
            else:
                volume_strength = "normal"

        return {
            "trend": trend,
            "breakout": breakout,
            "volume_strength": volume_strength,
            "volume_ratio": round(volume_ratio, 2),
            "momentum_percent": round(momentum_percent, 2),
            "data_quality": "valid",
            "data_warning": None,
        }
