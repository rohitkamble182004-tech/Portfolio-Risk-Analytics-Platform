"""
Tests for MarketDataService robustness:
  - yfinance raising an exception (YFTzMissingError-style, malformed
    JSON, or anything else) is normalized to an empty series rather
    than propagating a raw traceback.
  - When the real provider fails entirely, the synthetic fallback
    produces a *realistic historical series* (many distinct daily
    prices), not a single repeated value.
  - The fallback is deterministic per ticker (stable across calls).
  - The fallback can be disabled, and is force-disabled in production
    regardless of how the flag is set.
"""
from __future__ import annotations

from unittest.mock import patch

import numpy as np
import pandas as pd
import pytest

from app.config import Settings
from app.services.market_data_service import MarketDataService


class TestYfinanceDownloadNormalization:
    def test_exception_from_yfinance_becomes_empty_series(self):
        with patch(
            "app.services.market_data_service.yf.download",
            side_effect=Exception("YFTzMissingError: possibly delisted; no timezone found"),
        ):
            result = MarketDataService._yfinance_download("BADTICKER", "2024-01-01", "2024-12-31")
        assert result.empty

    def test_none_dataframe_becomes_empty_series(self):
        with patch("app.services.market_data_service.yf.download", return_value=None):
            result = MarketDataService._yfinance_download("AAPL", "2024-01-01", "2024-12-31")
        assert result.empty

    def test_missing_close_column_becomes_empty_series(self):
        df = pd.DataFrame({"Open": [1.0, 2.0]})
        with patch("app.services.market_data_service.yf.download", return_value=df):
            result = MarketDataService._yfinance_download("AAPL", "2024-01-01", "2024-12-31")
        assert result.empty


class TestSyntheticFallback:
    def test_generates_full_history_not_a_single_price(self):
        series = MarketDataService._generate_synthetic_prices("AAPL", lookback_days=100)
        assert len(series) == 100
        # Must have real day-to-day variation, not one price repeated.
        assert series.nunique() > 50

    def test_deterministic_per_ticker(self):
        s1 = MarketDataService._generate_synthetic_prices("AAPL", lookback_days=50)
        s2 = MarketDataService._generate_synthetic_prices("AAPL", lookback_days=50)
        assert np.allclose(s1.to_numpy(), s2.to_numpy())

    def test_different_tickers_get_different_series(self):
        s1 = MarketDataService._generate_synthetic_prices("AAPL", lookback_days=50)
        s2 = MarketDataService._generate_synthetic_prices("MSFT", lookback_days=50)
        assert not np.allclose(s1.to_numpy(), s2.to_numpy())

    def test_all_prices_positive_and_finite(self):
        series = MarketDataService._generate_synthetic_prices("AAPL", lookback_days=252)
        assert (series > 0).all()
        assert np.isfinite(series.to_numpy()).all()

    @pytest.mark.asyncio
    async def test_fetch_from_provider_falls_back_when_enabled(self):
        svc = MarketDataService()
        with patch(
            "app.services.market_data_service.MarketDataService._fetch_from_provider_or_raise",
            side_effect=ValueError("No data returned for AAPL"),
        ), patch("app.services.market_data_service.settings.market_data_fallback_enabled", True):
            result = await svc._fetch_from_provider("AAPL", lookback_days=60)

        assert not result.empty
        assert len(result) == 60

    @pytest.mark.asyncio
    async def test_fetch_from_provider_raises_when_fallback_disabled(self):
        svc = MarketDataService()
        with patch(
            "app.services.market_data_service.MarketDataService._fetch_from_provider_or_raise",
            side_effect=ValueError("No data returned for AAPL"),
        ), patch("app.services.market_data_service.settings.market_data_fallback_enabled", False):
            with pytest.raises(ValueError):
                await svc._fetch_from_provider("AAPL", lookback_days=60)


class TestFallbackProductionSafetyNet:
    def test_fallback_forced_off_in_production_even_if_set_true(self, monkeypatch):
        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("MARKET_DATA_FALLBACK_ENABLED", "true")
        s = Settings()
        assert s.market_data_fallback_enabled is False

    def test_fallback_respected_in_development(self, monkeypatch):
        monkeypatch.setenv("ENVIRONMENT", "development")
        monkeypatch.setenv("MARKET_DATA_FALLBACK_ENABLED", "true")
        s = Settings()
        assert s.market_data_fallback_enabled is True