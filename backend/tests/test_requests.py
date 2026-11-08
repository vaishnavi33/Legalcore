from tests.conftest import PDF


def test_guest_request_and_tracking(api):
    r = api.create(files=[("files", ("deed.pdf", PDF, "application/pdf"))])
    assert r.status_code == 201, r.text
    body = r.json()
    num = body["request_number"]
    assert num.startswith("LC-HYD-") and body["files_received"] == 1 and not body["linked_to_account"]
    t = api.post("/api/v1/track", json={"request_number": num.lower(), "phone": "98765 43210"})
    assert t.status_code == 200
    assert t.json()["status"] == "SUBMITTED"
    assert t.json()["steps"][0]["state"] == "current"
    assert "message" not in t.json()
    assert api.post("/api/v1/track", json={"request_number": num, "phone": "9123456789"}).status_code == 404


def test_validation(api):
    assert api.create(consent=False).status_code == 422
    assert api.create(branch="nowhere").status_code == 422
    assert api.create(audience="lawyer", service="case-drafting").status_code == 422  # no enrolment number
    assert api.create(audience="individual", service="case-drafting").status_code == 422  # lawyer-only service
    fake = api.create(files=[("files", ("x.pdf", b"MZ not a pdf", "application/pdf"))])
    assert fake.status_code == 400
    exe = api.create(files=[("files", ("x.exe", b"MZ", "application/octet-stream"))])
    assert exe.status_code == 400


def test_lawyer_request_unlocks_lawyer_pages(make_api):
    a = make_api()
    a.post("/api/v1/auth/register", json={"name": "Adv Ravi", "mobile": "9876500001", "password": "secret123"})
    r = a.create(audience="lawyer", service="case-drafting", enrolment_number="AP/99/2020", court="District Court, Kurnool")
    assert r.status_code == 201 and r.json()["linked_to_account"]
    me = a.get("/api/v1/auth/me").json()
    assert set(me["roles"]) == {"client", "lawyer"}
    assert me["lawyer_status"] == "pending"
    mine = a.get("/api/v1/requests?scope=mine").json()
    assert mine["total"] == 1


def test_object_level_access(make_api):
    client = make_api().login("9000000006")
    num = client.create().json()["request_number"]
    assert client.get(f"/api/v1/requests/{num}").status_code == 200
    other = make_api().login("9000000007")
    assert other.get(f"/api/v1/requests/{num}").status_code == 404
    knl_mgr = make_api().login("9000000003")
    assert knl_mgr.get(f"/api/v1/requests/{num}").status_code == 404
    hyd_mgr = make_api().login("9000000002")
    d = hyd_mgr.get(f"/api/v1/requests/{num}").json()
    assert d["can_manage"] and "UNDER_REVIEW" in d["allowed_next"]
    reviewer = make_api().login("9000000005")
    assert reviewer.get(f"/api/v1/requests/{num}").status_code == 404  # not assigned yet
    assert client.get("/api/v1/requests?scope=work").status_code == 403


def test_workflow_and_assignment(make_api):
    client = make_api().login("9000000006")
    num = client.create().json()["request_number"]
    mgr = make_api().login("9000000002")
    url = f"/api/v1/requests/{num}"
    assert mgr.post(url + "/status", json={"status": "COMPLETED"}).status_code == 409
    for s in ["UNDER_REVIEW", "ACCEPTED", "ASSIGNED", "IN_PROGRESS", "QUALITY_REVIEW"]:
        assert mgr.post(url + "/status", json={"status": s}).status_code == 200, s
    staff = {u["name"]: u["id"] for u in mgr.get("/api/v1/admin/staff?branch=hyderabad").json()}
    assert mgr.post(url + "/assign", json={"assignee_id": staff["Adv. Lakshmi Prasanna"]}).status_code == 200
    # A manager is not an advocate reviewer, so cannot approve legal content.
    d = mgr.get(url).json()
    assert "APPROVED" not in d["allowed_next"]
    assert mgr.post(url + "/status", json={"status": "APPROVED"}).status_code == 409
    reviewer = make_api().login("9000000005")
    assert reviewer.post(url + "/status", json={"status": "APPROVED", "note": "Checked."}).status_code == 200
    assert reviewer.post(url + "/status", json={"status": "COMPLETED"}).status_code == 200
    t = client.post("/api/v1/track", json={"request_number": num, "phone": "9876543210"}).json()
    assert all(s["state"] == "done" for s in t["steps"])
    # Client may ask for changes after completion, but not jump elsewhere.
    assert client.get(url).json()["allowed_next"] == ["REVISION_REQUESTED"]


def test_client_cancel_and_notes(make_api):
    client = make_api().login("9000000006")
    num = client.create().json()["request_number"]
    url = f"/api/v1/requests/{num}"
    mgr = make_api().login("9000000002")
    r = mgr.post(url + "/notes", data={"body": "Internal: check conflicts", "internal": "true"})
    assert r.status_code == 200
    r = mgr.post(url + "/notes", data={"body": "Please send the sale deed."})
    notes = client.get(url).json()["notes"]
    assert [n["body"] for n in notes] == ["Please send the sale deed."]
    r = client.post(url + "/notes", data={"body": "Attached", "internal": "true", "kind": "approved"}, files=[("files", ("deed.pdf", PDF, "application/pdf"))])
    assert r.status_code == 200
    d = client.get(url).json()
    assert d["notes"][-1]["internal"] is False and d["documents"][0]["kind"] == "original"
    doc = d["documents"][0]["id"]
    dl = client.get(f"{url}/documents/{doc}")
    assert dl.status_code == 200 and dl.content == PDF
    assert make_api().login("9000000007").get(f"{url}/documents/{doc}").status_code == 404
    assert client.post(url + "/status", json={"status": "CANCELLED"}).status_code == 200


def test_transfer_between_branches(make_api):
    client = make_api().login("9000000006")
    num = client.create().json()["request_number"]
    url = f"/api/v1/requests/{num}"
    hyd = make_api().login("9000000002")
    knl = make_api().login("9000000003")
    assert knl.post(url + "/transfer", json={"branch": "kurnool"}).status_code == 404
    assert hyd.post(url + "/transfer", json={"branch": "kurnool"}).status_code == 200
    assert knl.get(url).status_code == 200
    assert hyd.get(url).status_code == 404
    assert client.get(url).json()["branch"] == "Kurnool"


def test_work_queue_scoping(make_api):
    knl = make_api().login("9000000003")
    items = knl.get("/api/v1/requests?scope=work").json()["items"]
    assert items and all(i["branch_slug"] == "kurnool" for i in items)
    admin = make_api().login("admin@legalcore.in", "Admin@12345")
    assert admin.get("/api/v1/requests?scope=work").json()["total"] >= 4
    drafter = make_api().login("9000000004")
    assert all(i["branch_slug"] == "hyderabad" for i in drafter.get("/api/v1/requests?scope=work").json()["items"])
