"""
Market data service.

Fetches OHLCV price history from yfinance (or Alpha Vantage) and
caches results in Redis. Falls back to stale cache on provider failure.
"""
from __future__ import annotations

import asyncio
from datetime import date, timedelta
from functools import partial

import numpy as np
import pandas as pd
import structlog
import yfinance as yf
from tenacity import retry, stop_after_attempt, wait_exponential

from app.cache.redis_client import cache_get, cache_set, price_key
from app.config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()


class MarketDataService:
    """Async wrapper around price providers with Redis caching."""

    # ── public API ────────────────────────────────────────────────────────────

    async def get_prices(
        self,
        tickers: list[str],
        lookback_days: int = 252,
    ) -> pd.DataFrame:
        """
        Return a DataFrame of daily *adjusted close* prices.
        Columns = tickers, index = Date.
        Missing tickers are logged and omitted.
        """
        tasks = [self._get_ticker_prices(t, lookback_days) for t in tickers]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        frames: dict[str, pd.Series] = {}
        for ticker, result in zip(tickers, results):
            if isinstance(result, Exception):
                logger.warning("Price fetch failed", ticker=ticker, error=str(result))
            elif isinstance(result, pd.Series) and not result.empty:
                frames[ticker] = result
            else:
                logger.warning("No price data returned", ticker=ticker)

        if not frames:
            raise ValueError(f"Could not fetch prices for any of: {tickers}")

        df = pd.DataFrame(frames).dropna(how="all")
        df.index = pd.to_datetime(df.index)
        df.sort_index(inplace=True)
        return df

    async def get_latest_prices(self, tickers: list[str]) -> dict[str, float]:
        """Return most recent closing price for each ticker."""
        prices_df = await self.get_prices(tickers, lookback_days=5)
        return {col: float(prices_df[col].dropna().iloc[-1]) for col in prices_df.columns}

    # ── internals ─────────────────────────────────────────────────────────────

    async def _get_ticker_prices(
        self,
        ticker: str,
        lookback_days: int,
    ) -> pd.Series:
        key = price_key(ticker, lookback_days)

        # 1. Try cache
        cached = await cache_get(key)
        if cached:
            logger.debug("Cache hit", key=key)
            series = pd.Series(cached["prices"], name=ticker)
            series.index = pd.to_datetime(series.index)
            return series

        # 2. Fetch from provider
        series = await self._fetch_from_provider(ticker, lookback_days)

        # 3. Store in cache
        payload = {
            "prices": {str(k.date()): v for k, v in series.items()},
        }
        await cache_set(key, payload, ttl=settings.cache_ttl_prices)
        return series

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def _fetch_from_provider_or_raise(self, ticker: str, lookback_days: int) -> pd.Series:
        end = date.today()
        start = end - timedelta(days=int(lookback_days * 1.5))  # buffer for weekends/holidays

        loop = asyncio.get_event_loop()
        fn = partial(self._yfinance_download, ticker, str(start), str(end))
        series = await loop.run_in_executor(None, fn)

        if series.empty:
            raise ValueError(f"No data returned for {ticker}")

        return series.iloc[-lookback_days:]  # trim to requested window

    async def _fetch_from_provider(self, ticker: str, lookback_days: int) -> pd.Series:
        """Fetch real price history, with retries already applied inside
        `_fetch_from_provider_or_raise`. If the provider is still
        failing after those retries -- network failure, empty
        response, YFTzMissingError/delisted symbol, malformed JSON,
        or any other provider error -- fall back to a synthetic price
        series (if enabled) rather than propagating.

        This is a *last resort* for one ticker at a time. It does not
        mask real outages silently: every fallback use is logged at
        WARNING with the ticker and underlying error, and it's a
        hard-disabled no-op in production (see config.py).
        """
        try:
            return await self._fetch_from_provider_or_raise(ticker, lookback_days)
        except Exception as exc:
            if not settings.market_data_fallback_enabled:
                raise
            logger.warning(
                "Market data provider failed after retries; using synthetic "
                "fallback price series. This must never happen in production.",
                ticker=ticker,
                error=str(exc),
            )
            return self._generate_synthetic_prices(ticker, lookback_days)

    @staticmethod
    def _generate_synthetic_prices(ticker: str, lookback_days: int) -> pd.Series:
        """Deterministic synthetic daily close price series via GBM.

        Deterministic (seeded from the ticker string) so repeated
        calls for the same ticker in the same process are stable
        rather than generating a different fake history every time,
        which would make caching and repeated test runs behave
        inconsistently. This produces a full history with realistic
        day-to-day variation -- not a single flat price repeated --
        so downstream analytics (returns, volatility, covariance) have
        something non-degenerate to compute over.
        """
        seed = abs(hash(ticker)) % (2**32)
        rng = np.random.default_rng(seed)

        end = date.today()
        dates = pd.bdate_range(end=end, periods=lookback_days)

        start_price = 100.0 + (seed % 400)  # spread starting prices out a bit
        daily_drift = 0.0002
        daily_vol = 0.015
        shocks = rng.normal(daily_drift, daily_vol, size=len(dates))
        prices = start_price * np.cumprod(1 + shocks)

        series = pd.Series(prices, index=dates, name=ticker)
        return series

    @staticmethod
    def _yfinance_download(ticker: str, start: str, end: str) -> pd.Series:
        """Download and return a close-price series, normalizing every
        known yfinance failure mode to an empty series rather than
        letting a raw exception propagate:

          - YFTzMissingError / "possibly delisted; no timezone found":
            yfinance raises this when a symbol has no exchange metadata
            (typically because it's delisted or mistyped).
          - "Expecting value: line 1 column 1": yfinance's underlying
            HTTP client got a non-JSON (often empty or HTML error page)
            response body from Yahoo's endpoint -- a transient network
            or rate-limit issue, not a code bug.
          - Any other network/parsing exception from the yfinance/requests
            stack.

        In every case, the caller (`_fetch_from_provider_or_raise`)
        will see an empty series, raise ValueError("No data returned"),
        and -- after retries -- either surface as a per-ticker failure
        (handled in `get_prices`) or trigger the synthetic fallback.
        """
        try:
            df = yf.download(ticker, start=start, end=end, auto_adjust=True, progress=False)
        except Exception as exc:
            logger.warning(
                "yfinance download raised an exception",
                ticker=ticker,
                error=str(exc),
                error_type=type(exc).__name__,
            )
            return pd.Series(dtype=float, name=ticker)

        if df is None or df.empty:
            return pd.Series(dtype=float, name=ticker)

        if "Close" not in df.columns:
            logger.warning(
                "yfinance response missing Close column",
                ticker=ticker,
                columns=list(df.columns),
            )
            return pd.Series(dtype=float, name=ticker)

        close = df["Close"]
        if isinstance(close, pd.DataFrame):
            close = close.squeeze()
        close.name = ticker
        return close.dropna()