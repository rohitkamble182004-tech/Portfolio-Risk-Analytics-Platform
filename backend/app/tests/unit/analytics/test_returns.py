"""Unit tests for analytics/returns.py."""
import numpy as np
import pandas as pd
import pytest

from app.analytics.returns import (
    annualized_return,
    cumulative_returns,
    log_returns,
    portfolio_returns,
    simple_returns,
)


def make_prices(values: list[float]) -> pd.Series:
    idx = pd.date_range("2024-01-01", periods=len(values), freq="B")
    return pd.Series(values, index=idx)


class TestSimpleReturns:
    def test_basic(self):
        prices = make_prices([100, 110, 99])
        r = simple_returns(prices)
        assert len(r) == 2
        assert pytest.approx(r.iloc[0], rel=1e-4) == 0.10
        assert pytest.approx(r.iloc[1], rel=1e-4) == -0.10

    def test_drops_first_nan(self):
        prices = make_prices([100, 105, 110])
        r = simple_returns(prices)
        assert not r.isna().any()


class TestLogReturns:
    def test_log_return_additivity(self):
        """Log returns should compound additively."""
        prices = make_prices([100, 110, 121])
        r = log_returns(prices)
        total = r.sum()
        expected = np.log(121 / 100)
        assert pytest.approx(total, rel=1e-6) == expected

    def test_symmetry(self):
        """Log returns are symmetric: up then down returns ~0."""
        prices = make_prices([100, 110, 100])
        r = log_returns(prices)
        assert abs(r.sum()) < 0.01  # small due to log convexity


class TestPortfolioReturns:
    def test_equal_weight(self, sample_returns, sample_weights):
        weights = [1 / 3, 1 / 3, 1 / 3]
        port = portfolio_returns(sample_returns, weights)
        assert len(port) == len(sample_returns)
        assert not port.isna().any()

    def test_invalid_weights_raises(self, sample_returns):
        with pytest.raises(ValueError, match="Weights must sum"):
            portfolio_returns(sample_returns, [0.5, 0.5, 0.5])

    def test_single_asset(self, sample_returns):
        weights = [1.0, 0.0, 0.0]
        port = portfolio_returns(sample_returns, weights)
        pd.testing.assert_series_equal(port, sample_returns.iloc[:, 0], check_names=False)


class TestAnnualizedReturn:
    def test_positive_drift(self):
        """A series of small positive returns should annualize positively."""
        r = pd.Series([0.001] * 252)
        ann = annualized_return(r)
        assert ann > 0.25

    def test_empty_series(self):
        assert annualized_return(pd.Series([], dtype=float)) == 0.0


class TestCumulativeReturns:
    def test_starts_at_zero(self):
        r = pd.Series([0.01, -0.02, 0.03])
        cum = cumulative_returns(r)
        assert cum.iloc[0] == pytest.approx(0.01, rel=1e-6)

    def test_monotone_positive(self):
        r = pd.Series([0.01] * 10)
        cum = cumulative_returns(r)
        assert (cum.diff().dropna() > 0).all()