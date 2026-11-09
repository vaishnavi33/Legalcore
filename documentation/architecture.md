# Architecture

One platform, many services, six branches, centralised operations.

```
Browser ──► Next.js website (port 3000) ──/api/*──► FastAPI (port 8000) ──► PostgreSQL
                                                         └──► private document storage
```

The browser only ever talks to the website's address. A Next.js route (`frontend/app/api/[...path]/route.ts`) forwards `/api/*` to FastAPI at `API_URL`, so the session cookie stays first-party and there is no cross-site setup to secure.

## One sign-in for everyone

- People register with name, mobile number, optional email and password. Nobody chooses "lawyer" or "client" at sign-up.
- Every new account is a **client**.
- When a signed-in person sends a lawyer request with a Bar Council enrolment number, the account also becomes a **lawyer** (verification status `pending`). Lawyer options then appear in their dashboard, and an admin can mark the enrolment as verified.
- Staff accounts (drafting staff, advocate reviewer, branch manager, admin) are created by an admin.
- One person can hold several roles. For example, an advocate can also send requests as a client.

The session is a signed JWT in an `HttpOnly`, `SameSite=Lax` cookie. Every request that changes something must also carry `X-Requested-With: legalcore`, which a cross-site form cannot add, and this protects against CSRF. Deactivating a user, or changing their roles, signs them out everywhere.

## Who can see what

These rules live in `backend/app/services/permissions.py` and run on **every** API call. Hiding menu items is only a convenience.

| Role | Requests visible |
|---|---|
| Client or lawyer | Requests they sent |
| Drafting staff | Requests at their branches, plus any assigned to them |
| Advocate reviewer | Requests assigned to them |
| Branch manager | Requests at their branches; can assign, transfer and edit branch details |
| Admin, super admin | Everything |

A Hyderabad employee does not see Anantapur matters. If a request is transferred, the old branch loses access and its team assignments are cleared.

## Request lifecycle

`backend/app/services/workflow.py` holds the allowed transitions. Every change is recorded in `request_history` with who made it, when, and an optional message to the requester.

```
SUBMITTED → UNDER_SCREENING → ASSIGNED → IN_PROGRESS → (ADVOCATE_REVIEW) → QUALITY_REVIEW → CLIENT_REVIEW → COMPLETED
                 ↘ INFORMATION_REQUIRED ↗                                       ↘ REVISION_REQUIRED ↗
also: ON_HOLD, CANCELLED
```

- Every change records the old status, new status, who, when and a note. Staff must give a reason for On hold, Cancelled, Information required and Revision required. Internal notes are never shown to the requester.
- Services that involve legal advice (category "advice") must pass Advocate Review, and only a **verified advocate reviewer** can move a matter out of it. Admins cannot.
- Requests arrive unallocated. Support staff or admins allocate them to a branch; branch managers then assign staff after a conflict-of-interest check.
- Priority (Normal, High, Urgent, Deadline-sensitive) is set by staff for planning and is not a legal assessment.
- Guest tracking needs the reference number, the mobile number and a one-time code. The code is hashed, expires in 10 minutes, allows 5 attempts and is rate limited. Without an email or SMS provider, demo mode shows the code on screen; otherwise the API refuses rather than pretending to send.
- There is no quotation, payment or refund stage.

## Request numbers

`LC-XXXX-XXXX` uses 8 random characters from a 32-letter alphabet with no look-alike characters (about 10¹² possible numbers) and does not reveal the branch. Older `LC-HYD-…` numbers still work. A number alone never shows a request: tracking also needs the mobile number and a one-time code. Asking for a request you are not allowed to see returns the same "not found" as a request that does not exist.

## Documents

- Allowed types are PDF, DOC, DOCX, JPG and PNG, up to 10 MB each and 5 per upload. The file's first bytes are checked, so a renamed file is refused.
- Files are stored under random names outside the web root, with a SHA-256 checksum. They are only served through `/api/v1/requests/{number}/documents/{id}` after a permission check, and every download is logged.
- Each file has a kind: `original` (from the requester), `working` (staff only) or `approved` (the final document; only reviewers, managers and admins can upload one).

## Data model

Tables: `users`, `user_roles`, `lawyer_profiles`, `branches`, `staff_branch_assignments`, `services`, `requests`, `request_assignments`, `request_history`, `request_notes`, `documents`, `audit_logs`. Migrations are in `backend/migrations`.

## Not built yet (next phases)

| Item | Why it is not here yet | Where it plugs in |
|---|---|---|
| OTP sign-in and password reset by SMS | Needs an SMS provider account (MSG91, Twilio and so on) | `app/api/auth.py` |
| Email, SMS and WhatsApp alerts on status changes | Needs provider accounts | Hook into `workflow.change_status` |
| Payments | Deliberately not part of the platform: no public pricing, quotation or payment workflow | — |
| S3 storage and virus scanning | Needs an AWS account | Replace `LocalStorage` in `app/services/storage.py` |
| Shared rate limits | Only needed with more than one API server | Replace `app/core/ratelimit.py` with Redis |
| AI-assisted drafting and research | Phase 2 | A separate `ai-services/` module that reads requests and writes `working` documents for human review |
