# 🚀 Linkup — Student Teammate & Project Collaboration Platform

> *"Find the right people. Build better things."*

Linkup is a full-stack platform built for university students to find compatible project collaborators, build teams, and showcase their academic & technical skills.

---

## 🌟 Key Features

- **JWT Student Authentication**: Secure registration, login, JWT token verification, and bcrypt password hashing.
- **Dual Email Identity**: Primary personal email for login & communications, college email for institutional student badge verification.
- **5-Step Onboarding Wizard**:
  - *Step 1: Academics* — ROR v2 Organizations API autocomplete with auto-detected City, State, and Country.
  - *Step 2: Skills* — 260+ multi-disciplinary sector, development, and interview skills with live background search and inline `+10 More` expansion.
  - *Step 3: Interests* — 58 domain interests across tech, AI, design, business, biotech, law, and engineering with live search.
  - *Step 4: Bio & Availability* — Short bio and weekly availability selector.
  - *Step 5: Links* — GitHub and LinkedIn portfolio URLs.
- **Student Profile Page (`/profile`)**:
  - Full profile view with student verification badge, skills, interests, and portfolio links.
  - Interactive **"Edit Profile"** modal with real-time updates and ROR v2 location auto-detection.
- **Public Profile API (`GET /api/users/:userId`)**:
  - Exposes sanitized student profile data for Linkup Discovery, AI Teammate Matching, and Team Management modules while strictly preserving privacy (zero email/token leaks).

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), JavaScript, Vanilla CSS Design Tokens, Lucide Icons, React Router DOM.
- **Backend**: Express.js, Node.js, JSON Web Tokens (JWT), bcryptjs.
- **Database**: PostgreSQL (relational schema with custom ENUMs, triggers, and B-Tree indexes).
- **External Integration**: Research Organization Registry (ROR v2) API.

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
# Edit .env with your PostgreSQL credentials

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
| `GET` | `/api/auth/me` | Protected | Get current authenticated user |
| `GET` | `/api/skills` | Public | Get all 260+ skills |
| `GET` | `/api/interests` | Public | Get all 58 interest domains |
| `GET` | `/api/profile` | Protected | Get full student profile & status |
| `PUT` | `/api/profile` | Protected | Upsert student profile data |
| `GET` | `/api/users/:userId` | Public | Get sanitized student profile for Discovery/Matching |
