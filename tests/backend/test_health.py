import os
import sys
from fastapi.testclient import TestClient

# Ensure app import without importing heavy pipelines
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend')))
from app.main import app  # type: ignore

client = TestClient(app)

def test_health_ok():
    res = client.get('/health')
    assert res.status_code == 200
    assert res.json()['status'] == 'ok'
