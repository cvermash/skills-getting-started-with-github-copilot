"""Pytest fixtures for FastAPI app tests"""
import copy
import pytest
from fastapi.testclient import TestClient
from src.app import app, activities

@pytest.fixture
def client():
    """Provide a TestClient and restore in-memory activities after each test."""
    original = copy.deepcopy(activities)
    with TestClient(app) as client:
        yield client
    # Restore original activities state to keep tests isolated
    activities.clear()
    activities.update(original)
