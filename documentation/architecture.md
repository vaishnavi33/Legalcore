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
SUBMITTED → UNDER_REVIEW → ACCEPTED → (PAYMENT_PENDING) → ASSIGNED → IN_PROGRESS → QUALITY_REVIEW → APPROVED → COMPLETED
               ↘ AWAITING_INFORMATION ↗                        ↘ REVISION_REQUESTED ↗
also: ON_HOLD, CANCELLED, REJECTED, REFUND_PENDING
```

- Only an **advocate reviewer** or **admin** can approve legal content (QUALITY_REVIEW → APPROVED).
- Requesters can cancel early, answer "I have added the information", and ask for changes after completion.
- Public tracking (request number plus mobile number) shows the status only, never case details.

## Request numbers

`LC-<BRANCH>-XXXX-XXXX` uses 8 random characters from a 32-letter alphabet with no look-alike characters. That gives about 10¹² possible numbers per branch, so numbers cannot be guessed. Asking for a request you are not allowed to see returns the same "not found" as a request that does not exist.

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
| Payments (Razorpay) | Needs a Razorpay account and your fee list | `PAYMENT_PENDING` status already exists |
| S3 storage and virus scanning | Needs an AWS account | Replace `LocalStorage` in `app/services/storage.py` |
| Shared rate limits | Only needed with more than one API server | Replace `app/core/ratelimit.py` with Redis |
| AI-assisted drafting and research | Phase 2 | A separate `ai-services/` module that reads requests and writes `working` documents for human review |
