from tests.conftest import PDF, admin


def _start(api, num, phone="9876543210"):
    return api.post("/api/v1/track/start", json={"request_number": num.lower(), "phone": phone})


def test_tracking_needs_one_time_code(api):
    num = api.create(files=[("files", ("deed.pdf", PDF, "application/pdf"))]).json()["request_number"]
    assert api.post("/api/v1/track", json={"request_number": num, "phone": "9876543210"}).status_code in (404, 405)  # old open endpoint is gone
    assert _start(api, num, "9123456789").status_code == 404
    st = _start(api, num, "98765 43210")
    assert st.status_code == 200
    body = st.json()
    # Demo mode with no SMS/email provider: the code is shown, and nothing claims to have been sent.
    assert body["sent_to"] == [] and len(body["demo_code"]) == 6
    assert "message" not in body and "status" not in body
    wrong = "000000" if body["demo_code"] != "000000" else "111111"
    bad = api.post("/api/v1/track/verify", json={"challenge_id": body["challenge_id"], "code": wrong})
    assert bad.status_code == 422 and "4 attempts left" in bad.text
    ok = api.post("/api/v1/track/verify", json={"challenge_id": body["challenge_id"], "code": body["demo_code"]})
    assert ok.status_code == 200
    t = ok.json()
    assert t["status"] == "SUBMITTED" and t["steps"][0]["state"] == "current" and t["files_received"] == 1
    assert "message" not in t and "contact_phone" not in t
    # A code works once.
    assert api.post("/api/v1/track/verify", json={"challenge_id": body["challenge_id"], "code": body["demo_code"]}).status_code == 410
    # The short tracking session lets a guest add documents later.
    h = {"X-Track-Token": t["token"]}
    up = api.post("/api/v1/track/documents", headers=h, files=[("files", ("receipt.pdf", PDF, "application/pdf"))])
    assert up.status_code == 200 and up.json()["files_received"] == 2
    assert len(api.get("/api/v1/track/documents", headers=h).json()) == 2
    assert api.get("/api/v1/track/session", headers={"X-Track-Token": "nope"}).status_code == 401


def test_code_attempts_are_limited(api):
    num = api.create().json()["request_number"]
    body = _start(api, num).json()
    wrong = "000000" if body["demo_code"] != "000000" else "111111"
    for _ in range(5):
        api.post("/api/v1/track/verify", json={"challenge_id": body["challenge_id"], "code": wrong})
    assert api.post("/api/v1/track/verify", json={"challenge_id": body["challenge_id"], "code": body["demo_code"]}).status_code == 410


def test_guest_sees_only_shared_documents(make_api):
    guest = make_api()
    num = guest.create().json()["request_number"]
    a = admin(make_api)
    url = f"/api/v1/requests/{num}"
    a.post(url + "/notes", data={"kind": "draft"}, files=[("files", ("draft.pdf", PDF, "application/pdf"))])
    a.post(url + "/notes", data={"kind": "final", "body": "Your notice is ready."}, files=[("files", ("final.pdf", PDF, "application/pdf"))])
    a.post(url + "/notes", data={"body": "Internal only", "internal": "true"})
    body = _start(guest, num).json()
    t = guest.post("/api/v1/track/verify", json={"challenge_id": body["challenge_id"], "code": body["demo_code"]}).json()
    docs = guest.get("/api/v1/track/documents", headers={"X-Track-Token": t["token"]}).json()
    assert [d["filename"] for d in docs] == ["final.pdf"]
    r = guest.get(f"/api/v1/track/documents/{docs[0]['id']}", headers={"X-Track-Token": t["token"]})
    assert r.status_code == 200 and r.content == PDF


def test_no_code_without_provider_outside_demo(api, monkeypatch):
    from app.core.config import get_settings

    num = api.create().json()["request_number"]
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    r = _start(api, num)
    assert r.status_code == 503 and "could not send" in r.text
    logs = admin().get("/api/v1/admin/notifications").json()
    sms = [n for n in logs if n["channel"] == "sms" and n["subject"] == "Legal Core verification code"]
    assert sms and all(n["status"] == "not_configured" for n in sms)
