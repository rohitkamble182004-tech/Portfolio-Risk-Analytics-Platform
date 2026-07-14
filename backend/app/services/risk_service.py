"""
Risk service – orchestrates analytics modules to compute VaR, CVaR,
Sharpe ratio, max drawdown, and related metrics.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd
import structlog

from app.analytics import (
    log_returns, portfolio_returns,
    annualized_return, historical_volatility, portfolio_volatility,
    sample_covariance, ewma_covariance, correlation_from_covariance,
    historical_var, parametric_var,
    historical_cvar, parametric_cvar,
    sanitize_numeric,
)
from app.cache.redis_client import cache_get, cache_set, risk_key
from app.config import get_settings
from app.schemas.risk import RiskMetrics, RiskMethod, RiskRequest, VaRResult, CVaRResult
from app.services.market_data_service import MarketDataService

logger = structlog.get_logger(__name__)
settings = get_settings()

RISK_FREE_DAILY = 0.05 / 252   # 5% annual ≈ 0.0198% daily


class RiskService:
    def __init__(self, market_data: MarketDataService | None = None) -> None:
        self._mds = market_data or MarketDataService()

    async def compute_risk_metrics(self, req: RiskRequest) -> RiskMetrics:
        """
        Main entry point. Returns full risk metrics dict for a given request.
        Caches the serialised result in Redis.
        """
        cache_k = risk_key(req.tickers, req.weights, req.method.value,
                           req.confidence_level, req.time_horizon)
        cached = await cache_get(cache_k)
        if cached:
            return RiskMetrics(**cached)

        # Fetch prices and compute returns
        prices = await self._mds.get_prices(req.tickers, req.lookback_days)
        tickers_found = list(prices.columns)
        weights = self._align_weights(req.tickers, req.weights, tickers_found)

        asset_log_returns = log_returns(prices)
        port_returns = portfolio_returns(asset_log_returns, weights)
        cov = (ewma_covariance(asset_log_returns)
               if req.method == RiskMethod.parametric
               else sample_covariance(asset_log_returns))

        # VaR
        if req.method == RiskMethod.parametric:
            var_data = parametric_var(
                weights, asset_log_returns.mean().values, cov,
                req.confidence_level, req.time_horizon, req.portfolio_value,
            )
            cvar_data = parametric_cvar(
                weights, asset_log_returns.mean().values, cov,
                req.confidence_level, req.time_horizon, req.portfolio_value,
            )
        else:
            var_data = historical_var(
                port_returns, req.confidence_level, req.time_horizon, req.portfolio_value,
            )
            cvar_data = historical_cvar(
                port_returns, req.confidence_level, req.time_horizon, req.portfolio_value,
            )

        # Auxiliary metrics
        ann_return = annualized_return(port_returns)
        ann_vol = historical_volatility(port_returns)
        sharpe = self._sharpe(ann_return, ann_vol)
        sortino = self._sortino(port_returns, ann_return)
        max_dd = self._max_drawdown(port_returns)
        corr = correlation_from_covariance(cov).tolist()

        # Defense-in-depth boundary: everything above should already be
        # finite thanks to the root-cause fixes in app/analytics (log
        # returns dropping inf, covariance guards, annualized_return's
        # negative-cumulative floor). This is the safety net for
        # whatever edge case those didn't anticipate. VaR/CVaR are
        # *required* fields on the response schema, so they fall back
        # to 0.0 (a schema-valid "no risk measured" rather than a
        # validation error); the rest are Optional and fall back to
        # None per the sanitize_numeric spec.
        var_pct = sanitize_numeric(var_data["var_pct"], default=0.0)
        var_dollar = sanitize_numeric(var_data["var_dollar"], default=0.0)
        cvar_pct = sanitize_numeric(cvar_data["cvar_pct"], default=0.0)
        cvar_dollar = sanitize_numeric(cvar_data["cvar_dollar"], default=0.0)

        metrics = RiskMetrics(
            var=VaRResult(
                var_pct=var_pct,
                var_dollar=var_dollar,
                confidence_level=req.confidence_level,
                time_horizon=req.time_horizon,
                method=req.method.value,
            ),
            cvar=CVaRResult(
                cvar_pct=cvar_pct,
                cvar_dollar=cvar_dollar,
                confidence_level=req.confidence_level,
                time_horizon=req.time_horizon,
            ),
            sharpe_ratio=sanitize_numeric(sharpe),
            sortino_ratio=sanitize_numeric(sortino),
            max_drawdown=sanitize_numeric(max_dd),
            annualized_return=sanitize_numeric(ann_return),
            annualized_volatility=sanitize_numeric(ann_vol),
            correlation_matrix=sanitize_numeric(corr),
            tickers=tickers_found,
        )

        await cache_set(cache_k, metrics.model_dump(), ttl=settings.cache_ttl_metrics)
        return metrics

    # ── helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _align_weights(
        requested: list[str],
        weights: list[float],
        found: list[str],
    ) -> np.ndarray:
        """Re-normalise weights to only the tickers that returned data."""
        ticker_w = dict(zip(requested, weights))
        w = np.array([ticker_w.get(t, 0.0) for t in found])
        total = w.sum()
        if total <= 0:
            raise ValueError("No valid weights after ticker alignment")
        return w / total

    @staticmethod
    def _sharpe(ann_return: float, ann_vol: float) -> float | None:
        if ann_vol == 0:
            return None
        risk_free_annual = RISK_FREE_DAILY * 252
        return round((ann_return - risk_free_annual) / ann_vol, 4)

    @staticmethod
    def _sortino(port_returns: pd.Series, ann_return: float) -> float | None:
        downside = port_returns[port_returns < 0]
        if len(downside) == 0:
            return None
        downside_std = float(downside.std() * np.sqrt(252))
        if downside_std == 0:
            return None
        return round((ann_return - RISK_FREE_DAILY * 252) / downside_std, 4)

    @staticmethod
    def _max_drawdown(
        port_returns: pd.Series,
    ) -> float | None:
    
        if port_returns.empty:
            return None
    
        cum = (1 + port_returns).cumprod()
        rolling_max = cum.cummax()
        drawdown = (cum - rolling_max) / rolling_max
    
        dd = drawdown.min()
    
        if pd.isna(dd):
            return None
    
        if np.isinf(dd):
            return None
    
        return float(dd)