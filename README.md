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
- Node.js (v18+)
- PostgreSQL (v14+)

### 1. Database Setup
```bash
cd server
# Copy environment template
cp .env.example .env
# Edit .env with your PostgreSQL and SMTP credentials

# Initialize database schema and seed data
npm run db:init
```

### 2. Run Backend Server
```bash
cd server
npm run dev
# Express API will run on http://localhost:5000
```

### 3. Run Frontend App
```bash
cd client
npm install
npm run dev
# React app will run on http://localhost:5173
```

---

## 📜 API Documentation

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new student account |
| `POST` | `/api/auth/login` | Public | Authenticate user & get JWT token |
| `POST` | `/api/auth/reset-password`| Public | Reset forgotten password via OTP |
| `GET` | `/api/auth/me` | Protected | Get current authenticated user |
| `GET` | `/api/profile` | Protected | Get full student profile & status |
| `PUT` | `/api/profile` | Protected | Upsert student profile data |
| `GET` | `/api/users/:userId` | Protected | Get public student profile for Discovery |
| `GET` | `/api/melds` | Optional Auth | Discover & filter MELD project teams |
| `POST` | `/api/melds` | Protected | Create a new MELD team |
| `GET` | `/api/melds/:id` | Optional Auth | View detailed MELD project info & members |
| `POST` | `/api/melds/:id/join` | Protected | Submit candidate join request |
| `GET` | `/api/melds/:id/matches` | Protected | Run AI Matchmaking algorithm for candidates |
| `GET` | `/api/invitations` | Protected | Fetch incoming/outgoing invites & join requests |
| `POST` | `/api/invitations/:id/respond` | Protected | Accept or decline team invitations |
| `GET` | `/api/notifications` | Protected | Fetch in-app notifications and unread count |
| `PUT` | `/api/notifications/read-all` | Protected | Mark all notifications as read |

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
