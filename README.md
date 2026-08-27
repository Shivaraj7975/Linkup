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
| `GET` | `/api/users/:userId` | Public | Get sanitized student profile for Discovery |
