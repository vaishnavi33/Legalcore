def test_register_login_me(api):
    r = api.post("/api/v1/auth/register", json={"name": "Anita", "mobile": "+91 98765 11111", "email": "Anita@Example.com", "password": "secret123"})
    assert r.status_code == 201, r.text
    assert r.json()["roles"] == ["client"]
    assert r.json()["mobile"] == "9876511111"
    me = api.get("/api/v1/auth/me").json()
    assert me["name"] == "Anita"
    api.post("/api/v1/auth/logout")
    assert api.get("/api/v1/auth/me").status_code == 401
    api.login("anita@example.com", "secret123")
    api.login("09876511111", "secret123")


def test_duplicate_and_bad_password(api):
    assert api.post("/api/v1/auth/register", json={"name": "X Y", "mobile": "9000000006", "password": "secret123"}).status_code == 409
    r = api.post("/api/v1/auth/login", json={"identifier": "9000000006", "password": "wrong"})
    assert r.status_code == 401
    r = api.post("/api/v1/auth/login", json={"identifier": "nobody@x.in", "password": "wrong"})
    assert r.status_code == 401


def test_invalid_mobile(api):
    r = api.post("/api/v1/auth/register", json={"name": "X Y", "mobile": "12345", "password": "secret123"})
    assert r.status_code == 422


def test_csrf_header_required_with_cookie(make_api):
    a = make_api().login("9000000006")
    del a.c.headers["X-Requested-With"]
    assert a.c.post("/api/v1/auth/logout").status_code == 403


def test_deactivated_user_is_signed_out(make_api):
    admin = make_api().login("admin@legalcore.in", "Admin@12345")
    client = make_api().login("9000000006")
    me = client.get("/api/v1/auth/me").json()
    assert admin.patch(f"/api/v1/admin/users/{me['id']}", json={"is_active": False}).status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401
