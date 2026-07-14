"""Monte Carlo simulation endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import get_settings
from app.schemas.simulation import SimulationRequest, SimulationResult
from app.services.market_data_service import MarketDataService
from app.services.simulation_service import SimulationService

router = APIRouter(prefix="/simulation", tags=["simulation"])
settings = get_settings()


def get_simulation_service() -> SimulationService:
    return SimulationService(market_data=MarketDataService())


@router.post("/run", response_model=SimulationResult)
async def run_simulation(
    body: SimulationRequest,
    svc: SimulationService = Depends(get_simulation_service),
):
    """
    Run a Monte Carlo simulation using correlated GBM.

    Returns final-value percentiles, VaR/CVaR, probability of loss,
    and a sample of 50 paths for charting.

    Results are cached for 10 minutes (unless `random_seed` is provided).
    """
    if len(body.tickers) != len(body.weights):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="tickers and weights must have the same length",
        )
    if body.num_simulations > settings.max_simulations:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"num_simulations exceeds maximum of {settings.max_simulations}",
        )
    try:
        return await svc.run(body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {exc}") from exc


@router.get("/defaults")
async def simulation_defaults():
    """Return default simulation parameters from config."""
    return {
        "num_simulations": settings.default_simulations,
        "max_simulations": settings.max_simulations,
        "time_horizon": settings.default_time_horizon,
        "confidence_level": settings.default_confidence_level,
    }