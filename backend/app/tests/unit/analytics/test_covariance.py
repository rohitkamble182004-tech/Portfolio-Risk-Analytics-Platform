"""Unit tests for analytics/covariance.py."""
import numpy as np
import pandas as pd
import pytest

from app.analytics.covariance import (
    cholesky_decompose,
    correlation_from_covariance,
    ewma_covariance,
    generate_correlated_normals,
    sample_covariance,
)


@pytest.fixture
def returns_df():
    np.random.seed(42)
    n, k = 200, 3
    data = np.random.multivariate_normal(
        mean=[0.0003, 0.0002, 0.00025],
        cov=np.array([[0.015**2, 0.7*0.015*0.013, 0.5*0.015*0.012],
                      [0.7*0.015*0.013, 0.013**2, 0.6*0.013*0.012],
                      [0.5*0.015*0.012, 0.6*0.013*0.012, 0.012**2]]),
        size=n,
    )
    return pd.DataFrame(data, columns=["A", "B", "C"])


class TestSampleCovariance:
    def test_shape(self, returns_df):
        cov = sample_covariance(returns_df)
        assert cov.shape == (3, 3)

    def test_symmetric(self, returns_df):
        cov = sample_covariance(returns_df)
        np.testing.assert_allclose(cov, cov.T, atol=1e-12)

    def test_positive_diagonal(self, returns_df):
        cov = sample_covariance(returns_df)
        assert (np.diag(cov) > 0).all()


class TestEWMACovariance:
    def test_shape(self, returns_df):
        cov = ewma_covariance(returns_df)
        assert cov.shape == (3, 3)

    def test_symmetric(self, returns_df):
        cov = ewma_covariance(returns_df)
        np.testing.assert_allclose(cov, cov.T, atol=1e-10)

    def test_positive_diagonal(self, returns_df):
        cov = ewma_covariance(returns_df)
        assert (np.diag(cov) > 0).all()


class TestCholesky:
    def test_reconstruction(self, returns_df):
        cov = sample_covariance(returns_df)
        L = cholesky_decompose(cov)
        reconstructed = L @ L.T
        np.testing.assert_allclose(reconstructed, cov, atol=1e-6)

    def test_lower_triangular(self, returns_df):
        cov = sample_covariance(returns_df)
        L = cholesky_decompose(cov)
        assert np.allclose(np.triu(L, k=1), 0)


class TestCorrelation:
    def test_diagonal_ones(self, returns_df):
        cov = sample_covariance(returns_df)
        corr = correlation_from_covariance(cov)
        np.testing.assert_allclose(np.diag(corr), 1.0, atol=1e-10)

    def test_range(self, returns_df):
        cov = sample_covariance(returns_df)
        corr = correlation_from_covariance(cov)
        assert corr.max() <= 1.0 + 1e-9
        assert corr.min() >= -1.0 - 1e-9


class TestCorrelatedNormals:
    def test_shape(self, returns_df):
        cov = sample_covariance(returns_df)
        L = cholesky_decompose(cov)
        samples = generate_correlated_normals(L, n_samples=1000, rng=np.random.default_rng(0))
        assert samples.shape == (1000, 3)

    def test_approximate_covariance(self, returns_df):
        cov = sample_covariance(returns_df)
        L = cholesky_decompose(cov)
        samples = generate_correlated_normals(L, n_samples=50_000, rng=np.random.default_rng(0))
        emp_cov = np.cov(samples.T)
        np.testing.assert_allclose(emp_cov, cov, atol=0.002)