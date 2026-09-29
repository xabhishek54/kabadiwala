"""
Shared pytest configuration — uses the single in-memory engine from
tests/helpers.py and provides a per-test DB reset fixture.
"""
import pytest
from app.database import Base
from tests.helpers import engine


@pytest.fixture(autouse=True)
def reset_db():
    """Drop and recreate all tables before every test for full isolation."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
