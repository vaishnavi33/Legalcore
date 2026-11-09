from datetime import timedelta

from app.core.security import india_today
from tests.conftest import PDF, admin


def test_guest_request_without_branch(api):
    r = api.create(files=[("files", ("deed.pdf", PDF, "application/pdf")), ("files", ("photo.png", b"\x89PNG\r\n\x1a\nxxxx", "image/png"))])
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["request_number"].startswith("LC-") and len(body["request_number"]) == 12
    assert body["files_received"] == 2 and not body["linked_to_account"]
    # No provider is configured in tests, so nothing claims to have been sent.
    assert {a["status"] for a in body["acknowledgements"]} == {"not_configured"}
    d = admin().get(f"/api/v1/requests/{body['request_number']}").json()
    assert d["branch"] is None and d["priority"] == "normal" and d["status"] == "SUBMITTED"


def test_branch_field_is_ignored(api):
    num = api.create(branch="kurnool").json()["request_number"]
    assert admin().get(f"/api/v1/requests/{num}").json()["branch"] is None


def test_needed_by_must_be_two_india_days_ahead(api):
    today = india_today()
    for days, ok in [(-1, False), (0, False), (1, False), (2, True), (30, True)]:
        r = api.create(needed_by=(today + timedelta(days=days)).isoformat())
        assert (r.status_code == 201) == ok, (days, r.text)
    r = api.create(needed_by=(today + timedelta(days=1)).isoformat())
    assert "at least two days from today" in r.text
    assert api.create(needed_by=None).status_code == 422


def test_other_service_needs_description(api):
    assert api.create(service="other").status_code == 422
    assert "specify the legal service" in api.create(service="other", service_other="").text
    r = api.create(service="other", service_other="Help with a society registration")
    assert r.status_code == 201
    d = admin().get(f"/api/v1/requests/{r.json()['request_number']}").json()
    assert d["service_slug"] == "other" and d["service_other"] == "Help with a society registration"
    for aud in ("lawyer", "business"):
        extra = {"organisation": "Acme Pvt Ltd"} if aud == "business" else {}
        assert api.create(audience=aud, service="other", service_other="Something else", **extra).status_code == 201


def test_enrolment_number_is_optional(api):
    assert api.create(audience="lawyer", service="case-drafting").status_code == 201
    assert api.create(audience="lawyer", service="case-drafting", enrolment_number="AP/123/2019").status_code == 201
    assert api.create(audience="lawyer", service="case-drafting", enrolment_number="<script>").status_code == 422


def test_business_requests(api):
    assert api.create(audience="business", service="employment-documentation").status_code == 422  # organisation name
    r = api.create(audience="business", service="employment-documentation", organisation="Sri Sai Traders")
    assert r.status_code == 201
    assert api.create(audience="business", service="case-drafting", organisation="X Ltd").status_code == 422  # lawyer-only


def test_validation(api):
    assert api.create(consent=False).status_code == 422
    assert api.create(phone="12345").status_code == 422
    assert api.create(message="hi").status_code == 422
    assert api.create(audience="individual", service="case-drafting").status_code == 422  # lawyer-only service
    assert api.create(service="nonexistent").status_code == 422
    fake = api.create(files=[("files", ("x.pdf", b"MZ not a pdf", "application/pdf"))])
    assert fake.status_code == 400
    exe = api.create(files=[("files", ("x.exe", b"MZ", "application/octet-stream"))])
    assert exe.status_code == 400
    many = api.create(files=[("files", (f"f{i}.pdf", PDF, "application/pdf")) for i in range(11)])
    assert many.status_code == 400


def test_lawyer_request_is_not_verification(make_api):
    a = make_api()
    a.post("/api/v1/auth/register", json={"name": "Adv Ravi", "mobile": "9876500001", "password": "secret123"})
    r = a.create(audience="lawyer", service="case-drafting", enrolment_number="AP/99/2020", court="District Court, Kurnool")
    assert r.status_code == 201 and r.json()["linked_to_account"]
    me = a.get("/api/v1/auth/me").json()
    assert set(me["roles"]) == {"client", "lawyer"}
    assert me["lawyer_status"] == "pending"
    d = a.get(f"/api/v1/requests/{r.json()['request_number']}").json()
    assert d["enrolment_number"] == "AP/99/2020" and d["enrolment_verified"] is False


def test_object_level_access_and_allocation(make_api):
    client = make_api().login("9000000006")
    num = client.create().json()["request_number"]
    url = f"/api/v1/requests/{num}"
    assert client.get(url).status_code == 200
    assert make_api().login("9000000007").get(url).status_code == 404  # another client
    hyd_mgr = make_api().login("9000000002")
    assert hyd_mgr.get(url).status_code == 404  # not allocated to Hyderabad yet
    support = make_api().login("9000000008")
    assert support.get(url).status_code == 200  # support staff screen unallocated requests
    assert support.allocate(num)["branch"] == "Hyderabad"
    assert support.get(url).status_code == 404  # no longer in the intake queue
    assert hyd_mgr.get(url).json()["can_manage"]
    assert make_api().login("9000000003").get(url).status_code == 404  # Kurnool manager
    assert make_api().login("9000000005").get(url).status_code == 404  # reviewer, not assigned
    assert client.get("/api/v1/requests?scope=work").status_code == 403
    assert client.get(url).json()["branch"] == "Hyderabad"


def test_workflow_needs_advocate_for_opinions(make_api):
    client = make_api().login("9000000006")
    num = client.create(service="legal-opinion").json()["request_number"]
    url = f"/api/v1/requests/{num}"
    a = admin(make_api)
    a.allocate(num)
    mgr = make_api().login("9000000002")
    assert mgr.post(url + "/status", json={"status": "COMPLETED"}).status_code == 409
    for s in ["UNDER_SCREENING", "ASSIGNED", "IN_PROGRESS"]:
        assert mgr.post(url + "/status", json={"status": s}).status_code == 200, s
    assert "QUALITY_REVIEW" not in mgr.get(url).json()["allowed_next"]
    assert mgr.post(url + "/status", json={"status": "QUALITY_REVIEW"}).status_code == 409
    assert mgr.post(url + "/status", json={"status": "ADVOCATE_REVIEW"}).status_code == 200
    staff = {u["name"]: u["id"] for u in mgr.get("/api/v1/admin/staff?branch=hyderabad").json()}
    rid = staff["Adv. Lakshmi Prasanna (demo)"]
    assert mgr.post(url + "/assign", json={"assignee_id": rid}).status_code == 422  # conflict check not confirmed
    assert mgr.post(url + "/assign", json={"assignee_id": rid, "conflict_checked": True}).status_code == 200
    # A manager is not an advocate, so cannot sign off advocate review.
    assert mgr.post(url + "/status", json={"status": "QUALITY_REVIEW"}).status_code == 409
    assert a.post(url + "/status", json={"status": "QUALITY_REVIEW"}).status_code == 409  # nor can an admin
    reviewer = make_api().login("9000000005")
    assert reviewer.post(url + "/status", json={"status": "QUALITY_REVIEW", "note": "Reviewed."}).status_code == 200
    assert reviewer.post(url + "/status", json={"status": "CLIENT_REVIEW"}).status_code == 200
    assert client.get(url).json()["allowed_next"] == ["REVISION_REQUIRED", "COMPLETED"]
    assert client.post(url + "/status", json={"status": "COMPLETED"}).status_code == 200
    hist = a.get(url).json()["history"]
    assert [h["new_status"] for h in hist][-2:] == ["CLIENT_REVIEW", "COMPLETED"]
    assert all("at" in h for h in hist)
    logs = a.get("/api/v1/admin/audit-logs?action=request.status").json()
    assert any(l["detail"].get("old") == "ADVOCATE_REVIEW" and l["detail"].get("new") == "QUALITY_REVIEW" for l in logs)


def test_reason_required_and_internal_note_hidden(make_api):
    client = make_api().login("9000000006")
    num = client.create().json()["request_number"]
    url = f"/api/v1/requests/{num}"
    a = admin(make_api)
    assert a.post(url + "/status", json={"status": "ON_HOLD"}).status_code == 422
    assert a.post(url + "/status", json={"status": "ON_HOLD", "note": "Waiting for court order copy", "internal_note": "Check with Praveen"}).status_code == 200
    h = client.get(url).json()["history"][-1]
    assert h["note"] == "Waiting for court order copy" and h["internal_note"] == ""
    assert a.get(url).json()["history"][-1]["internal_note"] == "Check with Praveen"
    notes = client.get("/api/v1/notifications").json()
    assert notes and "On hold" in notes[0]["body"]


def test_priority_is_staff_only(make_api):
    client = make_api().login("9000000006")
    num = client.create().json()["request_number"]
    url = f"/api/v1/requests/{num}"
    assert client.post(url + "/priority", json={"priority": "urgent"}).status_code == 403
    a = admin(make_api)
    d = a.post(url + "/priority", json={"priority": "deadline_sensitive", "reason": "Hearing next week"}).json()
    assert d["priority"] == "deadline_sensitive"
    assert any("Priority changed" in n["body"] and n["internal"] for n in d["notes"])
    assert all("Priority" not in n["body"] for n in client.get(url).json()["notes"])


def test_notes_documents_and_versions(make_api):
    client = make_api().login("9000000006")
    num = client.create().json()["request_number"]
    url = f"/api/v1/requests/{num}"
    a = admin(make_api)
    a.allocate(num)
    mgr = make_api().login("9000000002")
    assert mgr.post(url + "/notes", data={"body": "Internal: check conflicts", "internal": "true"}).status_code == 200
    mgr.post(url + "/notes", data={"body": "Please send the sale deed."})
    assert [n["body"] for n in client.get(url).json()["notes"]] == ["Please send the sale deed."]
    # A requester cannot upload drafts or mark anything internal.
    r = client.post(url + "/notes", data={"body": "Attached", "internal": "true", "kind": "final"}, files=[("files", ("deed.pdf", PDF, "application/pdf"))])
    assert r.status_code == 200
    d = client.get(url).json()
    assert d["notes"][-1]["internal"] is False and d["documents"][0]["kind"] == "original"
    # Staff drafts stay hidden until shared.
    mgr.post(url + "/notes", data={"kind": "draft"}, files=[("files", ("written-statement.docx", b"PK\x03\x04xx", "application/octet-stream"))])
    mgr.post(url + "/notes", data={"kind": "revised_draft", "share": "true"}, files=[("files", ("written-statement.docx", b"PK\x03\x04yy", "application/octet-stream"))])
    staff_docs = mgr.get(url).json()["documents"]
    assert [(x["kind"], x["version"]) for x in staff_docs[1:]] == [("draft", 1), ("revised_draft", 2)]
    assert [x["kind"] for x in client.get(url).json()["documents"]] == ["original", "revised_draft"]
    # Final documents: managers may upload; a new final supersedes the old one.
    mgr.post(url + "/notes", data={"kind": "final"}, files=[("files", ("ws-final.pdf", PDF, "application/pdf"))])
    mgr.post(url + "/notes", data={"kind": "final"}, files=[("files", ("ws-final.pdf", PDF, "application/pdf"))])
    kinds = [x["kind"] for x in mgr.get(url).json()["documents"] if x["filename"] == "ws-final.pdf"]
    assert kinds == ["superseded", "final"]
    assert mgr.post(url + "/notes", data={"kind": "advocate_reviewed"}, files=[("files", ("x.pdf", PDF, "application/pdf"))]).status_code == 403
    assert mgr.post(url + "/notes", data={"body": "Looks fine", "note_kind": "review"}).status_code == 403
    # Downloads: owner yes, another client no, drafts never for the client.
    doc = d["documents"][0]["id"]
    dl = client.get(f"{url}/documents/{doc}")
    assert dl.status_code == 200 and dl.content == PDF
    assert make_api().login("9000000007").get(f"{url}/documents/{doc}").status_code == 404
    draft_id = staff_docs[1]["id"]
    assert client.get(f"{url}/documents/{draft_id}").status_code == 404
    assert client.post(url + "/status", json={"status": "CANCELLED"}).status_code == 200


def test_short_lived_links(make_api):
    client = make_api().login("9000000006")
    num = client.create(files=[("files", ("deed.pdf", PDF, "application/pdf"))]).json()["request_number"]
    url = f"/api/v1/requests/{num}"
    doc = client.get(url).json()["documents"][0]["id"]
    link = client.post(f"{url}/documents/{doc}/link").json()
    assert link["expires_in"] == 300
    anon = make_api()
    r = anon.get(link["url"])
    assert r.status_code == 200 and r.content == PDF and "inline" in r.headers["content-disposition"]
    assert anon.get("/api/v1/files/not-a-token").status_code == 410
    # Signing out everywhere kills existing links.
    client.post("/api/v1/auth/logout-everywhere")
    assert anon.get(link["url"]).status_code == 404


def test_transfer_between_branches(make_api):
    client = make_api().login("9000000006")
    num = client.create().json()["request_number"]
    url = f"/api/v1/requests/{num}"
    admin(make_api).allocate(num)
    hyd = make_api().login("9000000002")
    knl = make_api().login("9000000003")
    assert knl.post(url + "/transfer", json={"branch": "kurnool"}).status_code == 404
    assert hyd.post(url + "/transfer", json={"branch": "kurnool"}).status_code == 200
    assert knl.get(url).status_code == 200
    assert hyd.get(url).status_code == 404


def test_work_queue_scoping(make_api):
    knl = make_api().login("9000000003")
    items = knl.get("/api/v1/requests?scope=work").json()["items"]
    assert items and all(i["branch_slug"] == "kurnool" for i in items)
    a = admin(make_api)
    assert a.get("/api/v1/requests?scope=work").json()["total"] >= 5
    assert all(i["branch_slug"] is None for i in a.get("/api/v1/requests?scope=work&branch=unallocated").json()["items"])
    drafter = make_api().login("9000000004")
    assert all(i["branch_slug"] == "hyderabad" for i in drafter.get("/api/v1/requests?scope=work").json()["items"])
    support = make_api().login("9000000008")
    assert all(i["branch_slug"] is None for i in support.get("/api/v1/requests?scope=work").json()["items"])
