"""Risk metrics endpoints (VaR, CVaR, Sharpe, etc.)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.risk import RiskMetrics, RiskRequest
from app.services.market_data_service import MarketDataService
from app.services.risk_service import RiskService

router = APIRouter(prefix="/risk", tags=["risk"])


def get_risk_service() -> RiskService:
    return RiskService(market_data=MarketDataService())


@router.post("/metrics", response_model=RiskMetrics)
async def compute_risk_metrics(
    body: RiskRequest,
    svc: RiskService = Depends(get_risk_service),
):
    """
    Compute VaR, CVaR, Sharpe ratio, volatility and more for a given portfolio.

    **Methods:**
    - `historical` – empirical return distribution (default)
    - `parametric` – delta-normal with EWMA covariance
    - `monte_carlo` – simulation-based (use `/simulation/run` for full path data)
    """
    if len(body.tickers) != len(body.weights):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="tickers and weights must have the same length",
        )
    try:
        return await svc.compute_risk_metrics(body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Risk computation failed: {exc}") from exc


@router.get("/methods")
async def list_methods():
    """Return available VaR calculation methods."""
    return {
        "methods": [
            {"id": "historical", "description": "Historical simulation – uses empirical returns"},
            {"id": "parametric", "description": "Delta-normal with EWMA covariance"},
            {"id": "monte_carlo", "description": "Monte Carlo simulation"},
        ]
    }