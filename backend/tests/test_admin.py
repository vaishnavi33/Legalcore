from tests.conftest import admin


def test_admin_creates_staff_and_reports(make_api):
    a = admin(make_api)
    r = a.post("/api/v1/admin/users", json={"name": "New Drafter", "mobile": "9811111111", "password": "secret123", "roles": ["drafting_staff"], "branches": ["vijayawada"]})
    assert r.status_code == 201, r.text
    assert r.json()["branches"][0]["slug"] == "vijayawada"
    rep = a.get("/api/v1/admin/reports").json()
    assert rep["total"] >= 5 and len(rep["by_branch"]) == 7 and rep["by_branch"][0]["key"] == "unallocated"
    assert rep["unallocated"] >= 2 and rep["total_users"] >= 10 and rep["pending_verifications"] >= 1
    assert any(w["open"] >= 1 for w in rep["workload"])
    assert {p["key"] for p in rep["by_priority"]} == {"normal", "high", "urgent", "deadline_sensitive"}
    assert a.get("/api/v1/admin/audit-logs").status_code == 200
    sysinfo = a.get("/api/v1/admin/system").json()
    assert sysinfo["sms"] is False and sysinfo["demo_mode"] is True


def test_non_admin_blocked(make_api):
    mgr = make_api().login("9000000002")
    assert mgr.post("/api/v1/admin/users", json={"name": "Z Z", "mobile": "9811111112", "password": "secret123", "roles": ["admin"]}).status_code == 403
    rep = mgr.get("/api/v1/admin/reports").json()
    assert [b["key"] for b in rep["by_branch"]] == ["hyderabad"] and rep["total_users"] is None
    assert mgr.get("/api/v1/admin/advocates").status_code == 403
    client = make_api().login("9000000006")
    for path in ("reports", "users", "advocates", "system", "notifications"):
        assert client.get(f"/api/v1/admin/{path}").status_code == 403, path


def test_admin_cannot_grant_super_admin(make_api):
    a = make_api().login("9000000001")  # admin, not super admin
    r = a.post("/api/v1/admin/users", json={"name": "Z Z", "mobile": "9811111113", "password": "secret123", "roles": ["super_admin"]})
    assert r.status_code == 403


def test_branch_settings(make_api):
    mgr = make_api().login("9000000002")
    assert mgr.patch("/api/v1/admin/branches/hyderabad", json={"phone": "+91 40 0000 0000", "manager_name": "K. Rao"}).status_code == 200
    assert mgr.patch("/api/v1/admin/branches/hyderabad", json={"office_status": "operational"}).status_code == 403
    assert mgr.patch("/api/v1/admin/branches/kurnool", json={"phone": "1"}).status_code == 403
    a = admin(make_api)
    assert a.patch("/api/v1/admin/branches/hyderabad", json={"office_status": "operational"}).json()["office_status"] == "operational"
    assert a.patch("/api/v1/admin/branches/hyderabad", json={"office_status": "open"}).status_code == 422
    b = make_api().get("/api/v1/branches/kurnool").json()
    assert b["office_status"] == "planned" and b["address"] == "" and b["phone"] == ""


def test_services_and_fees_stay_internal(make_api):
    pub = make_api().get("/api/v1/services").json()
    assert "fee_text" not in pub[0] and any(s["slug"] == "other" for s in pub)
    assert {s["slug"] for s in pub} >= {"legal-opinion", "business-agreements", "employment-documentation", "case-preparation", "document-review"}
    a = admin(make_api)
    assert a.patch("/api/v1/admin/services/case-drafting", json={"fee_text": "Internal note"}).status_code == 200
    assert a.patch("/api/v1/admin/services/other", json={"is_active": False}).status_code == 422
    assert any(s["fee_text"] == "Internal note" for s in a.get("/api/v1/admin/services").json())


def test_advocate_verification(make_api):
    a = admin(make_api)
    lawyers = a.get("/api/v1/admin/advocates?status=pending").json()
    lw = next(x for x in lawyers if x["mobile"] == "9000000007")
    url = f"/api/v1/admin/advocates/{lw['user_id']}"
    assert a.patch(url, json={"verification_status": "verified"}).status_code == 422  # needs State Bar Council and a note
    assert a.patch(url, json={"state_bar_council": "Bar Council of Telangana", "verification_status": "verified"}).status_code == 422
    r = a.patch(url, json={"state_bar_council": "Bar Council of Telangana", "verification_status": "verified", "verification_note": "Checked roll on 9 Nov 2026"})
    assert r.status_code == 200 and r.json()["verified_by"] == "Legal Core Admin" and r.json()["verified_at"]
    assert a.patch(url, json={"verification_status": "suspended"}).status_code == 422  # reason
    assert a.patch(url, json={"verification_status": "suspended", "verification_note": "Under inquiry"}).json()["verification_status"] == "suspended"
    network = a.get("/api/v1/admin/advocates?kind=network").json()
    assert [n["mobile"] for n in network] == ["9000000005"]


def test_unverified_reviewer_cannot_be_assigned_or_sign_off(make_api):
    a = admin(make_api)
    rev = next(x for x in a.get("/api/v1/admin/advocates?kind=network").json())
    client = make_api().login("9000000006")
    num = client.create(service="legal-opinion").json()["request_number"]
    a.allocate(num)
    a.patch(f"/api/v1/admin/advocates/{rev['user_id']}", json={"verification_status": "suspended", "verification_note": "Lapsed"})
    r = a.post(f"/api/v1/requests/{num}/assign", json={"assignee_id": rev["user_id"], "conflict_checked": True})
    assert r.status_code == 422 and "verification" in r.text


def test_conflict_check_flags_same_parties(make_api):
    a = admin(make_api)
    staff = {u["name"]: u["id"] for u in a.get("/api/v1/admin/staff").json()}
    drafter = staff["Praveen Kumar (demo)"]
    c = make_api()
    first = c.create(name="Ravi Teja", opposite_party="Lakshmi Builders").json()["request_number"]
    a.allocate(first)
    assert a.post(f"/api/v1/requests/{first}/assign", json={"assignee_id": drafter, "conflict_checked": True}).status_code == 200
    # The builder now comes as a client against Ravi Teja.
    second = make_api().create(name="Lakshmi Builders", phone="9876501234", opposite_party="Ravi Teja").json()["request_number"]
    a.allocate(second)
    hits = a.get(f"/api/v1/requests/{second}/conflicts?assignee_id={drafter}").json()
    assert hits and hits[0]["request_number"] == first
    assert a.post(f"/api/v1/requests/{second}/assign", json={"assignee_id": drafter, "conflict_checked": True}).status_code == 422
    ok = a.post(f"/api/v1/requests/{second}/assign", json={"assignee_id": drafter, "conflict_checked": True, "conflict_note": "Different matter; cleared by manager"})
    assert ok.status_code == 200
