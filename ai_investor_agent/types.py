"""Shared data models used by the multi-agent workflow."""

from dataclasses import dataclass
from dataclasses import field


@dataclass
class MarketData:
    symbol: str
    closing_prices: list[float]
    latest_price: float
    data_quality: str = "valid"
    data_warning: str | None = None


@dataclass
class SignalAnalysis:
    trend: str
    momentum_percent: float
    confidence: float
    rationale: str


@dataclass
class TradeDecision:
    action: str
    confidence_score: float
    confidence_reason: str
    allocation_hint: str
    risk_note: str
    next_action: str
    alternatives: list[str] = field(default_factory=list)


@dataclass
class WorkflowResult:
    market_data: MarketData
    signal: dict[str, str | bool | float | None]
    decision: TradeDecision
    explanation: str
