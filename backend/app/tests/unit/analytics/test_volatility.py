"""Unit tests for analytics/volatility.py."""
import numpy as np
import pandas as pd
import pytest

from app.analytics.volatility import (
    ewma_volatility,
    historical_volatility,
    parkinson_volatility,
    portfolio_volatility,
    rolling_volatility,
)


@pytest.fixture
def daily_returns():
    np.random.seed(7)
    return pd.Series(np.random.normal(0.0003, 0.015, 252))


@pytest.fixture
def two_asset_cov():
    return np.array([
        [0.015 ** 2, 0.6 * 0.015 * 0.013],
        [0.6 * 0.015 * 0.013, 0.013 ** 2],
    ])


class TestHistoricalVolatility:
    def test_positive(self, daily_returns):
        assert historical_volatility(daily_returns) > 0

    def test_annualization(self):
        """Constant daily returns → annualized vol near 0."""
        r = pd.Series([0.001] * 252)
        assert historical_volatility(r) < 0.02  # tiny spread → near-zero vol

    def test_higher_noise_higher_vol(self):
        np.random.seed(0)
        low = pd.Series(np.random.normal(0, 0.005, 252))
        high = pd.Series(np.random.normal(0, 0.030, 252))
        assert historical_volatility(high) > historical_volatility(low)

    def test_too_short_returns_zero(self):
        assert historical_volatility(pd.Series([0.01])) == 0.0


class TestEWMAVolatility:
    def test_positive(self, daily_returns):
        assert ewma_volatility(daily_returns) > 0

    def test_lambda_effect(self, daily_returns):
        """Lower lambda weights recent obs more → different from sample vol."""
        vol_94 = ewma_volatility(daily_returns, lambda_=0.94)
        vol_97 = ewma_volatility(daily_returns, lambda_=0.97)
        # Both are positive; they differ because of different decay
        assert vol_94 != vol_97

    def test_too_short_returns_zero(self):
        assert ewma_volatility(pd.Series([0.01])) == 0.0


class TestParkinsonVolatility:
    def test_positive(self):
        np.random.seed(1)
        n = 100
        close = 100 * np.cumprod(1 + np.random.normal(0, 0.01, n))
        high = pd.Series(close * (1 + np.abs(np.random.normal(0, 0.005, n))))
        low = pd.Series(close * (1 - np.abs(np.random.normal(0, 0.005, n))))
        assert parkinson_volatility(high, low) > 0


class TestRollingVolatility:
    def test_length(self, daily_returns):
        rolled = rolling_volatility(daily_returns, window=21)
        assert len(rolled) == len(daily_returns)

    def test_nan_for_initial_window(self, daily_returns):
        rolled = rolling_volatility(daily_returns, window=21)
        assert rolled.iloc[:20].isna().all()
        assert not rolled.iloc[20:].isna().all()


class TestPortfolioVolatility:
    def test_positive(self, two_asset_cov):
        vol = portfolio_volatility([0.5, 0.5], two_asset_cov)
        assert vol > 0

    def test_single_asset_matches_individual(self):
        sigma = 0.015
        cov = np.array([[sigma ** 2]])
        vol = portfolio_volatility([1.0], cov)
        assert pytest.approx(vol, rel=1e-6) == sigma * np.sqrt(252)

    def test_diversification_reduces_vol(self, two_asset_cov):
        """Equally-weighted portfolio should have lower vol than max single-asset."""
        vol_equal = portfolio_volatility([0.5, 0.5], two_asset_cov)
        vol_all_first = portfolio_volatility([1.0, 0.0], two_asset_cov)
        assert vol_equal < vol_all_first