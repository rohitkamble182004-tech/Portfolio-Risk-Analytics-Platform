"""Unit tests for analytics/var.py and analytics/cvar.py."""
import numpy as np
import pandas as pd
import pytest

from app.analytics.cvar import cvar_from_simulations, historical_cvar, parametric_cvar
from app.analytics.var import historical_var, parametric_var, var_from_simulations


@pytest.fixture
def port_returns():
    np.random.seed(0)
    return pd.Series(np.random.normal(0.0003, 0.015, 500))


@pytest.fixture
def cov_2x2():
    return np.array([[0.015**2, 0.5 * 0.015 * 0.013],
                     [0.5 * 0.015 * 0.013, 0.013**2]])


class TestHistoricalVaR:
    def test_var_is_positive(self, port_returns):
        result = historical_var(port_returns, confidence_level=0.95)
        assert result["var_pct"] >= 0
        assert result["var_dollar"] >= 0

    def test_95_exceeds_90(self, port_returns):
        var90 = historical_var(port_returns, confidence_level=0.90)
        var95 = historical_var(port_returns, confidence_level=0.95)
        assert var95["var_pct"] >= var90["var_pct"]

    def test_horizon_scaling(self, port_returns):
        var1 = historical_var(port_returns, time_horizon=1)
        var5 = historical_var(port_returns, time_horizon=5)
        assert pytest.approx(var5["var_pct"], rel=1e-4) == var1["var_pct"] * np.sqrt(5)

    def test_dollar_scaling(self, port_returns):
        r1 = historical_var(port_returns, portfolio_value=100_000)
        r2 = historical_var(port_returns, portfolio_value=200_000)
        assert pytest.approx(r2["var_dollar"], rel=1e-4) == 2 * r1["var_dollar"]

    def test_empty_returns(self):
        result = historical_var(pd.Series([], dtype=float))
        assert result == {"var_pct": 0.0, "var_dollar": 0.0}


class TestParametricVaR:
    def test_returns_positive(self, cov_2x2):
        result = parametric_var(
            weights=[0.6, 0.4],
            mean_returns=[0.0003, 0.0002],
            cov_matrix=cov_2x2,
            confidence_level=0.95,
        )
        assert result["var_pct"] >= 0

    def test_higher_vol_higher_var(self):
        base_cov = np.diag([0.01**2, 0.01**2])
        high_cov = np.diag([0.03**2, 0.03**2])
        w = [0.5, 0.5]
        mu = [0.0, 0.0]
        var_base = parametric_var(w, mu, base_cov)["var_pct"]
        var_high = parametric_var(w, mu, high_cov)["var_pct"]
        assert var_high > var_base


class TestVaRFromSimulations:
    def test_basic(self):
        np.random.seed(1)
        sims = np.random.normal(0.0003, 0.015, 10_000)
        result = var_from_simulations(sims, confidence_level=0.95, portfolio_value=100_000)
        assert result["var_pct"] >= 0
        assert 0 < result["var_dollar"] < 100_000

    def test_99_exceeds_95(self):
        np.random.seed(2)
        sims = np.random.normal(0.0003, 0.015, 10_000)
        var95 = var_from_simulations(sims, confidence_level=0.95)["var_pct"]
        var99 = var_from_simulations(sims, confidence_level=0.99)["var_pct"]
        assert var99 >= var95


class TestCVaR:
    def test_cvar_exceeds_var(self, port_returns):
        var = historical_var(port_returns, confidence_level=0.95)["var_pct"]
        cvar = historical_cvar(port_returns, confidence_level=0.95)["cvar_pct"]
        assert cvar >= var

    def test_cvar_from_simulations(self):
        np.random.seed(3)
        sims = np.random.normal(0.0, 0.015, 10_000)
        cvar = cvar_from_simulations(sims, confidence_level=0.95)
        assert cvar["cvar_pct"] >= 0

    def test_parametric_cvar_positive(self, cov_2x2):
        result = parametric_cvar(
            weights=[0.6, 0.4],
            mean_returns=[0.0003, 0.0002],
            cov_matrix=cov_2x2,
            confidence_level=0.95,
        )
        assert result["cvar_pct"] >= 0