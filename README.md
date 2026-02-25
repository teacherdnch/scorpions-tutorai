# Tutorai — AI Testing & Mentorship System

An AI-powered adaptive testing and mentorship platform with three user roles: **Student**, **Teacher**, and **Admin**.

## Project Structure

```
Scorpions/
├── backend/                  ← Node.js + Express REST API
│   ├── src/
│   │   ├── db/               ← SQLite schema & connection
│   │   ├── middleware/       ← JWT auth & role guard
│   │   ├── routes/           ← auth, admin, teacher, tests
│   │   └── services/         ← OpenAI AI service
│   ├── .env                  ← Environment variables (create from .env.example)
│   ├── .env.example
│   └── package.json
├── frontend/                 ← Next.js 14 App Router
│   ├── app/
│   │   ├── login/            ← Login page
│   │   ├── register/         ← Register page (role selector)
│   │   ├── student/          ← Dashboard, Take Test, Results
│   │   ├── teacher/          ← Dashboard, Student detail
│   │   └── admin/            ← Dashboard, Codes, Users
│   ├── components/           ← Navbar
│   ├── lib/                  ← api.js, auth.js helpers
│   └── package.json
├── README.md
└── requirements.txt
```

## Tech Stack

| Layer      | Technology                            |
|------------|---------------------------------------|
| Frontend   | Next.js 14, Tailwind CSS v4, Recharts |
| Backend    | Node.js, Express.js                   |
| Database   | SQLite (via better-sqlite3)           |
| Auth       | JWT + bcryptjs                        |
| AI         | OpenAI API (gpt-3.5-turbo)           |

## Getting Started

### 1. Backend

```bash
cd backend
npm install
# Copy .env.example to .env and fill in your OPENAI_API_KEY
cp .env.example .env
npm run dev       # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:3000
```

### 3. First-time setup

1. Open http://localhost:3000/register
2. Register with role **Admin**
3. Go to **Admin → Codes** and generate a teacher registration code
4. Register a **Teacher** account using that code
5. Register a **Student** account
6. As student: take an AI-generated test, view results & recommendations

## User Roles

| Role    | Capabilities                                          |
|---------|-------------------------------------------------------|
| Admin   | Generate teacher codes, view all users & stats        |
| Teacher | View all students, individual analytics               |
| Student | Take AI tests, view results with explanations, charts |

## API Endpoints

| Method | Path                         | Auth     | Description               |
|--------|------------------------------|----------|---------------------------|
| POST   | /api/auth/register           | —        | Register (all roles)      |
| POST   | /api/auth/login              | —        | Login                     |
| POST   | /api/admin/codes             | Admin    | Generate teacher code     |
| GET    | /api/admin/codes             | Admin    | List all codes            |
| GET    | /api/admin/users             | Admin    | List all users            |
| GET    | /api/admin/stats             | Admin    | User & test counts        |
| GET    | /api/teacher/students        | Teacher  | List students             |
| GET    | /api/teacher/students/:id/analytics | Teacher | Student detail   |
| GET    | /api/tests/subjects          | Any      | List subjects             |
| POST   | /api/tests/generate          | Any      | AI test generation        |
| POST   | /api/tests/submit            | Any      | Grade + analyse mistakes  |
| GET    | /api/tests/history           | Any      | Student test history      |
| GET    | /api/tests/progress          | Any      | Aggregated stats          |
| GET    | /api/tests/:id               | Any      | Test detail               |
