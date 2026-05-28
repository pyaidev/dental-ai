import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./data/test.db"

from app.database import Base, get_db
from app.main import app
from app.routers.auth import hash_password

from fastapi.testclient import TestClient

TEST_DB = "sqlite:///./data/test.db"


@pytest.fixture(scope="session")
def engine():
    if os.path.exists("./data/test.db"):
        os.remove("./data/test.db")
    engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    # Create admin
    from app.models import AdminUser
    Session = sessionmaker(bind=engine)
    s = Session()
    s.add(AdminUser(username="admin", password_hash=hash_password("admin123"), fio="Admin", role="admin"))
    s.commit()
    s.close()
    yield engine
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./data/test.db"):
        os.remove("./data/test.db")


@pytest.fixture
def db_session(engine):
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def client(engine):
    def override_get_db():
        Session = sessionmaker(bind=engine)
        session = Session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clear_rate_limit():
    from app.routers import auth
    auth._login_attempts = {}
    auth.MAX_ATTEMPTS = 9999
    yield


@pytest.fixture
def auth_token(client):
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}
