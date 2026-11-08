# Legal Core

One platform for Legal Core's six branches (Anantapur, Puttaparthi, Vijayawada, Visakhapatnam, Kurnool and Hyderabad). It serves two kinds of people:

- **Lawyers** send drafting, research and document requests.
- **Individuals** ask legal questions, get help with documents and book advocate consultations.

Everyone uses one sign-in. After signing in, people see the pages and requests that belong to them. Staff see their branch's work queue, and admins see everything.

| Part | Technology | Folder |
|---|---|---|
| Website and dashboards | Next.js 16, React 19, TypeScript | `frontend/` |
| API | FastAPI, SQLAlchemy 2, Alembic | `backend/` |
| Database | PostgreSQL 16 | Docker volume `pgdata` |
| Documents | Private disk storage behind an authorised download endpoint (switch to S3 later) | Docker volume `uploads` |

The design and the reasons behind it are in [documentation/architecture.md](documentation/architecture.md). The steps to put the platform online are in [documentation/deployment.md](documentation/deployment.md).

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
ADMIN_PASSWORD='choose-one' python -m app.seed --demo   # --demo adds sample staff and requests
uvicorn app.main:app --reload

# 3. Website (http://localhost:3000)
cd ../frontend
npm install
npm run dev
```

### Demo accounts (only with `--demo`; the password for all of them is `Demo@12345`)

| Who | Sign in with | What they see |
|---|---|---|
| Admin | 9000000001 | Everything: all branches, people and roles, fees, activity log |
| Branch manager, Hyderabad | 9000000002 | Hyderabad work queue, assign and transfer, reports, branch details |
| Branch manager, Kurnool | 9000000003 | Kurnool only |
| Drafting staff, Hyderabad | 9000000004 | Hyderabad work queue |
| Advocate reviewer | 9000000005 | Requests assigned to them; the only staff role (with admins) that can approve legal work |
| Client | 9000000006 | Their own requests |
| Lawyer | 9000000007 | Their own requests, plus lawyer request options |

The super admin you created with `ADMIN_PASSWORD` signs in with `ADMIN_EMAIL` (default `admin@legalcore.in`).

## Tests

```bash
cd backend && pytest -q                     # uses SQLite by default
DATABASE_URL=postgresql+psycopg://legalcore:legalcore@localhost:5432/legalcore_test pytest -q
cd frontend && npm run typecheck && npm run build
```

GitHub Actions runs the backend tests against PostgreSQL and type-checks and builds the website on every push.

## Common changes

- **Branch address, phone and hours.** Branch managers and admins change these in the dashboard under Branch details. No code change is needed.
- **Service fees.** Admins change these in the dashboard under Branches and fees.
- **Head office phone, email and WhatsApp.** Set `NEXT_PUBLIC_CONTACT_*` in `.env`.
- **Service descriptions, FAQs, Knowledge Centre guides and search keywords.** Edit `frontend/lib/content.ts`.
- **Staff accounts and roles.** Admins manage these in the dashboard under People and roles.
