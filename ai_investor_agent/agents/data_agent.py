"""Data agent for fetching live stock data using yfinance."""

from __future__ import annotations

from typing import Any

import yfinance as yf

from ai_investor_agent.types import MarketData


def fetch_stock_data(
    symbols: list[str],
    portfolio: list[dict[str, Any]] | None = None,
) -> dict[str, dict[str, Any]]:
    """Fetch price, current volume, and 5-day average volume for each symbol.

    Returns data in this shape:
    {
        "RELIANCE.NS": {
            "price": 1234.56,
            "volume": 9876543,
            "avg_volume": 8765432.1
        }
    }

    If a symbol is invalid or data is missing, numeric fields are returned as
    ``None`` and an ``error`` field explains what went wrong.
    """
    results: dict[str, dict[str, Any]] = {}

    for raw_symbol in symbols:
        symbol = str(raw_symbol).strip().upper()
        results[symbol] = {
            "price": None,
            "volume": None,
            "avg_volume": None,
            "data_quality": "missing",
        }

        if not symbol:
            results[symbol]["error"] = "Empty symbol provided."
            continue

        try:
            ticker = yf.Ticker(symbol)
            history = ticker.history(period="10d", interval="1d")

            if history.empty:
                results[symbol]["error"] = "No market data found. Symbol may be invalid or delisted."
                continue

            close_series = history["Close"].dropna()
            volume_series = history["Volume"].dropna()

            if close_series.empty:
                results[symbol]["error"] = "Price data is missing."
                continue

            if volume_series.empty:
                results[symbol]["error"] = "Volume data is missing."
                results[symbol]["data_quality"] = "fallback"
                continue

            latest_price = float(close_series.iloc[-1])
            latest_volume = int(volume_series.iloc[-1])

            recent_5_day_volume = volume_series.tail(5)
            if len(recent_5_day_volume) < 5:
                results[symbol]["error"] = "Not enough volume history to compute 5-day average."
                results[symbol]["price"] = latest_price
                results[symbol]["volume"] = latest_volume
                results[symbol]["data_quality"] = "fallback"
                continue

            avg_volume = float(recent_5_day_volume.mean())

            results[symbol]["price"] = latest_price
            results[symbol]["volume"] = latest_volume
            results[symbol]["avg_volume"] = avg_volume
            results[symbol]["data_quality"] = "valid"

        except Exception as exc:
            results[symbol]["error"] = f"Failed to fetch data: {exc}"

    return results


class DataAgent:
    """Class wrapper used by the workflow orchestrator."""

    def fetch_stock_data(
        self,
        symbols: list[str],
        portfolio: list[dict[str, Any]] | None = None,
    ) -> dict[str, dict[str, Any]]:
        return fetch_stock_data(symbols, portfolio=portfolio)

    def fetch(
        self,
        symbol: str,
        portfolio: list[dict[str, Any]] | None = None,
    ) -> MarketData:
        """Fetch a single symbol and map it to workflow-friendly MarketData."""
        normalized_symbol = str(symbol).strip().upper()
        if not normalized_symbol:
            prices = self._fallback_series("UNKNOWN")
            return MarketData(
                symbol="UNKNOWN",
                closing_prices=prices,
                latest_price=prices[-1],
                data_quality="missing",
                data_warning="Empty symbol provided; fallback price series used.",
            )

        try:
            history = yf.Ticker(normalized_symbol).history(period="10d", interval="1d")
        except Exception as exc:
            prices = self._fallback_series(normalized_symbol)
            return MarketData(
                symbol=normalized_symbol,
                closing_prices=prices,
                latest_price=prices[-1],
                data_quality="fallback",
                data_warning=f"Price fetch failed; fallback price series used ({exc}).",
            )

        if history.empty:
            prices = self._fallback_series(normalized_symbol)
            return MarketData(
                symbol=normalized_symbol,
                closing_prices=prices,
                latest_price=prices[-1],
                data_quality="missing",
                data_warning="No market history found; symbol may be invalid or delisted.",
            )

        close_series = history["Close"].dropna()
        if close_series.empty:
            prices = self._fallback_series(normalized_symbol)
            return MarketData(
                symbol=normalized_symbol,
                closing_prices=prices,
                latest_price=prices[-1],
                data_quality="missing",
                data_warning="Close price history is missing; fallback price series used.",
            )

        prices = [float(price) for price in close_series.tail(7).tolist()]
        if len(prices) < 7:
            prices = self._pad_to_seven_days(prices)
            return MarketData(
                symbol=normalized_symbol,
                closing_prices=prices,
                latest_price=prices[-1],
                data_quality="fallback",
                data_warning="Insufficient close history; padded fallback values were used.",
            )

        return MarketData(
            symbol=normalized_symbol,
            closing_prices=prices,
            latest_price=prices[-1],
            data_quality="valid",
            data_warning=None,
        )

    @staticmethod
    def _pad_to_seven_days(prices: list[float]) -> list[float]:
        if not prices:
            return [100.0] * 7
        last_price = prices[-1]
        while len(prices) < 7:
            prices.insert(0, last_price)
        return prices

    @staticmethod
    def _fallback_series(symbol: str) -> list[float]:
        base = 80 + (sum(ord(char) for char in symbol) % 220)
        return [round(base * (1 + step * 0.004), 2) for step in range(-3, 4)]


if __name__ == "__main__":
    # Example usage:
    # Install dependency first: pip install yfinance
    sample_symbols = ["RELIANCE.NS", "TCS.NS", "INVALID123"]
    data = fetch_stock_data(sample_symbols)
    for symbol, metrics in data.items():
        print(f"{symbol}: {metrics}")
