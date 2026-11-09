# Legal Core

Legal Core solutions is a legal support and coordination agency operating in India. This repository holds its website and request platform for three kinds of people:

- **Lawyers and advocates** send drafting, research, document and case preparation requests.
- **Individuals** ask for legal opinions, notices, agreements, property paperwork and advocate consultations.
- **Businesses and organisations** ask for agreements, contracts, employment documentation and ongoing support.

It is a managed service, not a marketplace. Registration is optional: guests submit a request, get a reference number and track it with a one-time code. Requests are allocated to a branch internally; people never choose one. Legal opinions, advice and representation are provided only by appropriately qualified advocates.

Everyone uses one sign-in. Staff see their branch's work queue and admins see everything.

| Part | Technology | Folder |
|---|---|---|
| Website and dashboards | Next.js 16, React 19, TypeScript | `frontend/` |
| API | FastAPI, SQLAlchemy 2, Alembic | `backend/` |
| Database | PostgreSQL 16 | Docker volume `pgdata` |
| Documents | Private disk storage behind an authorised download endpoint (switch to S3 later) | Docker volume `uploads` |

The design and the reasons behind it are in [documentation/architecture.md](documentation/architecture.md). The steps to put the platform online are in [documentation/deployment.md](documentation/deployment.md).

## Free online preview

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/vaishnavi33/Legalcore)

This sets up the database, API and website on Render's free plan from `render.yaml`.

Alternatively, create one Render **Web Service** from this repository with the **Docker** runtime. The root `Dockerfile` runs the API and website together with a built-in SQLite database. That data resets whenever the service restarts.

 It loads fictional demo users and shows a demo banner, so use it for trying things out only. Set `DEMO_PASSWORD` in the Render dashboard (never in the repository). Free services sleep when nobody visits, and the first page after a while takes about a minute to load.

## Run it on your computer

You need Python 3.12+, Node 22+ and PostgreSQL 16.

```bash
# 1. Database
createuser -P legalcore            # password: legalcore
createdb -O legalcore legalcore

# 2. API (http://localhost:8000, API docs at /api/docs)
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
DEMO_PASSWORD='pick-a-private-one' ADMIN_PASSWORD='choose-one' python -m app.seed --demo   # --demo adds fictional users and requests
uvicorn app.main:app --reload

# 3. Website (http://localhost:3000)
cd ../frontend
npm install
npm run dev
```

### Demo users (only with `--demo`)

The demo users are fictional (mobile numbers 9000000001 to 9000000009, emails at `demo.legalcore.example`). Their password is whatever you set in the private `DEMO_PASSWORD` environment variable. If you do not set one, a random password is printed in the server log. Passwords are never written in this repository.

The demo administrator (9000000001) is disabled unless `DEMO_ADMIN_ENABLED=true`. Never enable it on a public site. For your own admin account, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` privately; that super admin signs in with `ADMIN_EMAIL`.

| Who | Mobile | What they see |
|---|---|---|
| Branch manager, Hyderabad | 9000000002 | Hyderabad work queue, assign and transfer, reports, branch details |
| Branch manager, Kurnool | 9000000003 | Kurnool only |
| Drafting staff, Hyderabad | 9000000004 | Hyderabad work queue |
| Advocate reviewer (verified, demo) | 9000000005 | Matters assigned for advocate review; the only role that can complete advocate review |
| Individual client | 9000000006 | Their own requests |
| Lawyer (enrolment pending) | 9000000007 | Their own requests and lawyer request options |
| Support staff | 9000000008 | Unallocated requests; allocates them to branches |
| Business client | 9000000009 | Their organisation's requests |

## Tests

```bash
cd backend && pytest -q                     # uses SQLite by default
DATABASE_URL=postgresql+psycopg://legalcore:legalcore@localhost:5432/legalcore_test pytest -q
cd frontend && npm run typecheck && npm run build
```

GitHub Actions runs the backend tests against PostgreSQL and type-checks and builds the website on every push.

## Common changes

- **Branch address, phone, hours and status.** Admins and branch managers change these in Admin, Branches. Empty fields show "Not yet published" on the website. Only publish real, confirmed details.
- **Services.** Admins rename, switch off or add an internal fee note in Admin, Services. Fees are never shown publicly.
- **Advocate verification.** Admins check enrolment numbers against the State Bar Council roll in Admin, Advocate verification. A submitted number is never treated as proof.
- **Head office contact and grievance officer.** Set `NEXT_PUBLIC_CONTACT_*` and `NEXT_PUBLIC_GRIEVANCE_*` (see `.env.example`).
- **Email, virus scanning.** Set `SMTP_*` and `CLAMD_HOST`. Admin, System shows what is set up and logs every notification attempt with its real result.
- **Knowledge Centre articles.** Edit `frontend/lib/articles.ts`. Articles show "Awaiting review by a qualified advocate" until `reviewedBy` is filled in.
- **Staff accounts and roles.** Admin, People and roles.

## Not built yet

SMS and WhatsApp sending (no provider connected), two-factor sign-in for staff, password reset by SMS or email, editing Knowledge Centre articles from the admin screens, cloud file storage (S3), and AI drafting help.
