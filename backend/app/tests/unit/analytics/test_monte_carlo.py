"""Unit tests for analytics/monte_carlo.py."""
import numpy as np
import pytest

from app.analytics.monte_carlo import run_simulation, sample_paths, simulation_summary


@pytest.fixture
def sim_params():
    np.random.seed(0)
    k = 3
    weights = np.array([0.4, 0.35, 0.25])
    mean_returns = np.array([0.0003, 0.00025, 0.0002])
    cov = np.array([
        [0.015**2, 0.6 * 0.015 * 0.013, 0.5 * 0.015 * 0.012],
        [0.6 * 0.015 * 0.013, 0.013**2, 0.55 * 0.013 * 0.012],
        [0.5 * 0.015 * 0.012, 0.55 * 0.013 * 0.012, 0.012**2],
    ])
    return weights, mean_returns, cov


class TestRunSimulation:
    def test_output_shape(self, sim_params):
        w, mu, cov = sim_params
        paths = run_simulation(w, mu, cov, num_simulations=500, time_horizon=21, random_seed=0)
        assert paths.shape == (500, 22)  # T+1 columns

    def test_initial_value(self, sim_params):
        w, mu, cov = sim_params
        pv = 123_456.0
        paths = run_simulation(w, mu, cov, portfolio_value=pv,
                               num_simulations=100, time_horizon=5, random_seed=1)
        np.testing.assert_allclose(paths[:, 0], pv)

    def test_reproducibility(self, sim_params):
        w, mu, cov = sim_params
        p1 = run_simulation(w, mu, cov, num_simulations=100, time_horizon=10, random_seed=42)
        p2 = run_simulation(w, mu, cov, num_simulations=100, time_horizon=10, random_seed=42)
        np.testing.assert_array_equal(p1, p2)

    def test_different_seeds_differ(self, sim_params):
        w, mu, cov = sim_params
        p1 = run_simulation(w, mu, cov, num_simulations=100, time_horizon=10, random_seed=1)
        p2 = run_simulation(w, mu, cov, num_simulations=100, time_horizon=10, random_seed=2)
        assert not np.array_equal(p1, p2)

    def test_positive_values(self, sim_params):
        w, mu, cov = sim_params
        paths = run_simulation(w, mu, cov, num_simulations=500, time_horizon=252, random_seed=5)
        assert (paths > 0).all()


class TestSimulationSummary:
    def test_keys_present(self, sim_params):
        w, mu, cov = sim_params
        paths = run_simulation(w, mu, cov, num_simulations=1000, time_horizon=21, random_seed=0)
        summary = simulation_summary(paths)
        required_keys = {
            "num_simulations", "time_horizon", "initial_value", "final_values",
            "var_dollar", "cvar_dollar", "probability_of_loss", "expected_final_value",
        }
        assert required_keys.issubset(summary.keys())

    def test_percentile_ordering(self, sim_params):
        w, mu, cov = sim_params
        paths = run_simulation(w, mu, cov, num_simulations=2000, time_horizon=21, random_seed=0)
        summary = simulation_summary(paths)
        fv = summary["final_values"]
        assert fv["p5"] <= fv["p10"] <= fv["p25"] <= fv["p50"] <= fv["p75"] <= fv["p90"] <= fv["p95"]

    def test_cvar_exceeds_var(self, sim_params):
        w, mu, cov = sim_params
        paths = run_simulation(w, mu, cov, num_simulations=5000, time_horizon=21, random_seed=0)
        summary = simulation_summary(paths)
        assert summary["cvar_dollar"] >= summary["var_dollar"]

    def test_prob_loss_in_range(self, sim_params):
        w, mu, cov = sim_params
        paths = run_simulation(w, mu, cov, num_simulations=1000, time_horizon=252, random_seed=0)
        summary = simulation_summary(paths)
        assert 0.0 <= summary["probability_of_loss"] <= 1.0


class TestSamplePaths:
    def test_returns_subset(self, sim_params):
        w, mu, cov = sim_params
        paths = run_simulation(w, mu, cov, num_simulations=500, time_horizon=10, random_seed=0)
        sampled = sample_paths(paths, n_paths=20)
        assert len(sampled) == 20

    def test_path_length(self, sim_params):
        w, mu, cov = sim_params
        t = 10
        paths = run_simulation(w, mu, cov, num_simulations=100, time_horizon=t, random_seed=0)
        sampled = sample_paths(paths, n_paths=5)
        assert all(len(p) == t + 1 for p in sampled)