"""FastAPI backend for the AI Investor Agent system."""

from __future__ import annotations

from typing import Any

from fastapi import Body
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_investor_agent.api_service import InvestorAnalysisService


class PortfolioItem(BaseModel):
    symbol: str
    weight: float


app = FastAPI(
    title="AI Investor Agent API",
    version="1.0.0",
    description="Backend API for portfolio-aware stock analysis.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = InvestorAnalysisService()


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "AI Investor Agent API is running.",
        "analyze_endpoint": "POST /analyze",
    }


@app.post("/analyze")
def analyze(
    portfolio: list[PortfolioItem] = Body(...)
) -> dict[str, Any]:
    normalized_input = [
        {"symbol": item.symbol, "weight": item.weight}
        for item in portfolio
    ]

    try:
        return service.analyze(normalized_input)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
