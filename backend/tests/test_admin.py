def test_admin_creates_staff_and_reports(make_api):
    admin = make_api().login("admin@legalcore.in", "Admin@12345")
    r = admin.post("/api/v1/admin/users", json={"name": "New Drafter", "mobile": "9811111111", "password": "secret123", "roles": ["drafting_staff"], "branches": ["vijayawada"]})
    assert r.status_code == 201, r.text
    assert r.json()["branches"][0]["slug"] == "vijayawada"
    rep = admin.get("/api/v1/admin/reports").json()
    assert rep["total"] >= 4 and len(rep["by_branch"]) == 6
    assert admin.get("/api/v1/admin/audit-logs").status_code == 200


def test_non_admin_blocked(make_api):
    mgr = make_api().login("9000000002")
    assert mgr.post("/api/v1/admin/users", json={"name": "Z Z", "mobile": "9811111112", "password": "secret123", "roles": ["admin"]}).status_code == 403
    rep = mgr.get("/api/v1/admin/reports").json()
    assert [b["key"] for b in rep["by_branch"]] == ["hyderabad"]
    client = make_api().login("9000000006")
    assert client.get("/api/v1/admin/reports").status_code == 403
    assert client.get("/api/v1/admin/users").status_code == 403


def test_admin_cannot_grant_super_admin(make_api):
    admin = make_api().login("9000000001")  # admin, not super admin
    r = admin.post("/api/v1/admin/users", json={"name": "Z Z", "mobile": "9811111113", "password": "secret123", "roles": ["super_admin"]})
    assert r.status_code == 403


def test_branch_and_fee_updates(make_api):
    mgr = make_api().login("9000000002")
    assert mgr.patch("/api/v1/admin/branches/hyderabad", json={"phone": "+91 40 0000 0000"}).status_code == 200
    assert mgr.patch("/api/v1/admin/branches/kurnool", json={"phone": "1"}).status_code == 403
    admin = make_api().login("admin@legalcore.in", "Admin@12345")
    assert admin.patch("/api/v1/admin/services/case-drafting", json={"fee_text": "From ₹3,000"}).status_code == 200
    assert make_api().get("/api/v1/services/case-drafting").json()["fee_text"] == "From ₹3,000"
