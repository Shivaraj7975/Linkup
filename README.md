# 🚀 MELD — Student Teammate & Project Collaboration Platform

> *"Don't ask around, post it and gather the crew."*

**MELD** is a full-stack platform built for university students to find compatible project collaborators, build teams, and showcase their academic & technical skills.

---

## 🌟 Key Features

- **Authentication & Security**: 
  - Secure registration, login, and JWT token verification.
  - Custom OTP-based verification for email confirmation.
  - Complete "Forgot Password" flow with OTP code recovery and spam-prevention cooldowns.
  - Smart route protection prevents logged-in users from accessing public authentication pages.
- **Dual Email Identity**: Primary personal email for login & communications, college email for institutional student badge verification.
- **5-Step Onboarding Wizard**:
  - *Step 1: Academics* — Auto-detects University/College via ROR v2 Organizations API.
  - *Step 2: Skills* — 260+ multi-disciplinary skills with live background search.
  - *Step 3: Interests* — 58 domain interests across tech, AI, design, business, etc.
  - *Step 4: Bio & Availability* — Short bio and weekly availability selector.
  - *Step 5: Links* — GitHub and LinkedIn portfolio URLs.
- **Student Profile & Team Management (`/profile`)**:
  - Interactive Profile UI with student verification badges.
  - Real-time team chat and direct messaging built on WebSocket connections.
  - Dynamic pagination and infinite scroll for chat histories.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), JavaScript, Vanilla CSS Design Tokens, Lucide Icons, React Router DOM.
- **Backend**: Express.js, Node.js, JSON Web Tokens (JWT), bcryptjs, Socket.IO.
- **Database**: PostgreSQL (relational schema with custom ENUMs, triggers, and B-Tree indexes).
- **External Services**: Research Organization Registry (ROR v2) API, Resend/Brevo for OTP Emails.

---

## 🚀 Getting Started

### Prerequisites
- Node.js v20+ (v22.x is what CI and the Azure deploy workflows use; `react-router-dom` 7 and `resend` 6 require Node 20 or newer)
- PostgreSQL (v14+; CI uses v16)

### 1. Database Setup
```bash
cd server
npm install
# Copy environment template, then edit .env with your PostgreSQL credentials,
# JWT_SECRET, OTP_PEPPER and (optionally) Brevo SMTP / AI provider keys
cp .env.example .env

# Fresh database only. DESTRUCTIVE: drops and recreates all tables, then seeds skills/interests
npm run db:init

# Upgrade an existing database in place (idempotent, no data loss). Run after db:init
# and after pulling new code.
npm run db:migrate
```

> `db:init` is for an empty database. Re-running it against an existing schema fails
> (e.g. `relation "meld_messages" already exists`); use `db:migrate` instead.
> `db:init` alone is **not** enough: without `db:migrate` the app and the integration
> tests fail on missing columns.
>
> Keep `DB_NAME` set in `.env`. If it is unset, `db:init` defaults to `meld_db` while the
> API and `db:migrate` default to `linkup_db`, so they would use different databases.

### 2. Run Backend Server
```bash
cd server
npm run dev
# Express API will run on http://localhost:5000 (health check: GET /api/health)
```

### 3. Run Frontend App
```bash
cd client
npm install
npm run dev
# React app will run on http://localhost:5173 (Vite proxies /api to http://localhost:5000)
```

---

## ⚙️ Environment Variables

Server (`server/.env`, see `server/.env.example`):

| Variable | Required | Notes |
| :--- | :--- | :--- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Yes (or `DATABASE_URL`) | Discrete credentials take precedence over `DATABASE_URL` when `DB_HOST`, `DB_USER` and `DB_PASSWORD` are all set. |
| `DATABASE_URL` | Alternative | Connection string; enables SSL automatically. |
| `JWT_SECRET` | Yes | Auth fails loudly when unset. |
| `OTP_PEPPER` | Yes | Used to hash OTP codes (falls back to `JWT_SECRET`). |
| `CLIENT_ORIGIN` | Yes in production | Comma-separated allowed origins. In production all CORS requests are rejected when unset. |
| `NODE_ENV`, `PORT`, `JWT_EXPIRES_IN` | No | Defaults: `PORT=5000`, `JWT_EXPIRES_IN=24h`. `NODE_ENV=production` forces DB SSL. |
| `DB_SSL`, `DB_SSL_CA` / `DB_CA_CERT` / `DB_SSL_CA_PATH`, `DB_SSL_REJECT_UNAUTHORIZED` | No | TLS options for managed PostgreSQL (Azure, Neon, ...). |
| `BREVO_*`, `SENDER_EMAIL`, `SENDER_NAME` | For email | OTP / notification email delivery. |
| `GROQ_*`, `NVIDIA_*`, `VOIDAI_*`, `GEMINI_API_KEY`, `NEMOTRON_MODEL`, `AI_PROVIDER_*` | No | AI matchmaking providers; matching falls back to deterministic scoring when none respond. |

Client (`client/.env`, see `client/.env.example`):

| Variable | Notes |
| :--- | :--- |
| `VITE_API_BASE_URL` | API base URL, inlined at **build** time. Defaults to `/api` (works with the Vite dev proxy). Must be set for any production build where the API is on a different origin. |

---

## 🧪 Testing & CI

```bash
cd server
# Requires a reachable, initialised and migrated database (see Database Setup)
npm test            # integration suite + security hardening suite
npm run test:security

cd ../client
npm run lint        # eslint (CI fails on errors, warnings are allowed)
npm run build
```

When PostgreSQL is unreachable the server suites print `database is not reachable`,
skip their database assertions and still exit 0. Do not treat that as a pass.

GitHub Actions:

| Workflow | Trigger | What it does |
| :--- | :--- | :--- |
| `.github/workflows/ci.yml` | Pull requests, manual | Server: PostgreSQL 16 service, `db:init`, `db:migrate`, `npm test` (fails if the DB tests were skipped). Client: `npm ci`, lint, build. No deploy, no secrets. |
| `.github/workflows/main_meld-api-2026.yml` | Push to `main`, manual | `npm ci`, `npm test` (runs **without** a database, so DB tests are skipped), deploys `server/` to Azure Web App `meld-api-2026` (Production slot). |
| `.github/workflows/main_meld-web-2026.yml` | Push to `main`, manual | `npm ci`, lint, `vite build` (with optional repository variable `VITE_API_BASE_URL`), deploys `client/` to Azure Web App `meld-web-2026` (Production slot). |

Database migrations are **not** run by any workflow. After a deploy that changes the
schema, run `npm run db:migrate` from `server/` against the production database.

---

## 📜 API Documentation

Every route is mounted under `/api` and, for backwards compatibility, also at the root
(e.g. `/auth/login`). Meld routes are also available under the legacy `/linkups` prefix.

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Liveness check; reports `database: connected/disconnected` (always HTTP 200) |
| `POST` | `/api/auth/register` | Public | Register new student account |
| `POST` | `/api/auth/login` | Public | Authenticate user & get JWT token |
| `POST` | `/api/auth/login-otp` | Public | Log in with an emailed OTP |
| `GET` | `/api/auth/check-username` | Public | Check username availability |
| `POST` | `/api/auth/send-otp` | Public | Send a verification / login / reset OTP |
| `POST` | `/api/auth/verify-otp` | Public | Verify an OTP |
| `POST` | `/api/auth/reset-password` | Public | Reset forgotten password via OTP |
| `GET` | `/api/auth/me` | Protected | Get current authenticated user |
| `GET` | `/api/skills` | Public | Skill catalogue |
| `GET` | `/api/interests` | Public | Interest catalogue |
| `GET` | `/api/profile` | Protected | Get full student profile & status |
| `PUT` | `/api/profile` | Protected | Upsert student profile data |
| `POST` | `/api/profile/link-college-email` | Protected | Link a college email for verification |
| `DELETE` | `/api/profile/unlink-college-email` | Protected | Unlink the college email |
| `GET` | `/api/users/search` | Protected | Search users to invite |
| `GET` | `/api/users/:userId` | Public | Public (sanitised) student profile for Discovery |
| `GET` | `/api/melds` | Optional Auth | Discover & filter MELD project teams |
| `POST` | `/api/melds` | Protected | Create a new MELD team |
| `GET` | `/api/melds/:id` | Optional Auth | View detailed MELD project info & members |
| `PUT` | `/api/melds/:id` | Protected | Edit a MELD (creator) |
| `DELETE` | `/api/melds/:id` | Protected | Delete a MELD (creator) |
| `POST` | `/api/melds/:id/join` | Protected | Submit candidate join request |
| `POST` | `/api/melds/:id/leave` | Protected | Leave a MELD |
| `GET` | `/api/melds/:id/requests` | Protected | List join requests for a MELD |
| `POST` | `/api/join-requests/:requestId/accept` | Protected | Accept a join request |
| `POST` | `/api/join-requests/:requestId/reject` | Protected | Reject a join request |
| `DELETE` | `/api/join-requests/:requestId` | Protected | Withdraw own join request |
| `GET` | `/api/my-join-requests` | Protected | Own join requests (alias: `/api/user/join-requests`) |
| `DELETE` | `/api/melds/:id/members/:userId` | Protected | Remove a team member |
| `POST` | `/api/melds/:id/invite` | Protected | Invite a user (creator only) |
| `GET` | `/api/melds/:id/matches` | Protected | Run AI Matchmaking algorithm for candidates |
| `GET` | `/api/melds/:id/filter-options` | Protected | Candidate filter options |
| `GET` | `/api/melds/:id/candidate-count` | Protected | Eligible candidate count |
| `GET` | `/api/melds/:meldId/messages` | Protected | Team chat history (paginated) |
| `GET` | `/api/invitations` | Protected | Fetch incoming/outgoing invites & join requests |
| `POST` | `/api/invitations/:id/respond` | Protected | Accept or decline team invitations |
| `GET` | `/api/notifications` | Protected | Fetch in-app notifications and unread count |
| `PUT` | `/api/notifications/read-all` | Protected | Mark all notifications as read |
| `PUT` | `/api/notifications/:id/read` | Protected | Mark one notification as read |
| `DELETE` | `/api/notifications/clear-all` | Protected | Delete all notifications |
| `DELETE` | `/api/notifications/:id` | Protected | Delete one notification |
| `GET` / `PATCH` / `DELETE` | `/api/admin/...` | Admin | Stats, user and MELD moderation (`/stats`, `/users`, `/melds`) |

---

## 📦 Version History & Release Notes

### **v1.1.0 (Latest Release)** — *Collaboration Hub & Notification Center*
- **🔔 Real-Time In-App Notification Center (`/notifications`)**:
  - Live alerts for join requests, team invitations, application acceptances, and deduplicated team chat messages.
  - Tab filters: *All*, *Unread*, *Team Updates*, and *Messages*.
  - 1-click *Mark as Read*, *Mark All as Read*, and *Clear All* functionality.
  - Unread notification counter badges integrated across Desktop and Mobile navigation headers.
- **📩 Unified Invitations & Requests Management (`/invitations`)**:
  - Centralized dashboard for both candidate project join requests and creator team invitations.
  - Received / Sent tabs with real-time Accept, Decline, and Request Withdrawal actions.
- **🛡️ Strict Creator-Only Invitation Security**:
  - Enforced server-side and client-side permissions: only Meld creators can invite members; all team members and peers can share public links.
- **✉️ Dual-Email OTP Distinction**:
  - Verification emails now explicitly specify whether the OTP is for Personal registration or College student verification.
- **🔄 Lifecycle & Collaboration Fixes**:
  - Resolved re-join capability for candidates re-applying after leaving a Meld.

### **v1.0.3** — *UI Aesthetics & Modern Dark Blue Theme*
- Cohesive modern dark theme with tailored cyan/blue accents and glassmorphic card design tokens.
- Fully responsive layout overhaul for Mobile, Tablet, and Desktop displays.

### **v1.0.2** — *Share & Invitation Foundations*
- Modal dialogs for sharing Meld project links and searching platform peers to invite.
- Modularized CSS architecture across `base`, `layout`, `components`, `pages`, and `responsive` stylesheets.
