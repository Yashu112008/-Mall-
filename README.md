# 🏬 Mall Manager

Mall management web app: stores, tenants, rent, parking, dashboard, user roles.
Stack: Node.js + Express + SQLite (backend), plain HTML/CSS/JavaScript (frontend).

## Folder structure
```
mall-manager/
├── backend/
│   ├── server.js            app start, security middleware, routes
│   ├── seed.js              optional demo data
│   ├── .env                 secrets (you create it, never share it)
│   └── src/
│       ├── db.js            database tables
│       ├── audit.js         audit-log helper
│       ├── middleware/      auth.js (login+roles), validate.js, error.js
│       └── routes/          auth, users, stores, tenants, rent, parking, dashboard, crud (shared)
└── frontend/
    ├── index.html, login.html
    ├── css/style.css
    └── js/                  api.js (server calls), ui.js (modals/toasts), app.js (pages), login.js
```

## Run (first time)
1. Install Node.js (LTS) from nodejs.org.
2. `cd backend` then `npm install`
3. Copy `.env.example` to `.env` and fill it:
   - JWT_SECRET: run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and paste it
   - ADMIN_EMAIL / ADMIN_PASSWORD: your first login
4. Optional demo data: `npm run seed`
5. `npm run dev`
6. Open http://localhost:5000 and login.

## Roles
- admin: everything, including users and deletes
- manager: view, add and edit (no delete)
- staff: view, and add/edit parking entries

## Security included
bcrypt password hashing, JWT with expiry and server-side invalidation on logout,
account lockout after 5 failed logins, login rate limit, global rate limit, helmet headers + CSP,
strict CORS, request size limit, zod validation on every input, parameterised SQL (no SQL injection),
role-based access, audit log, XSS-safe rendering (esc()), no stack traces to users.

## Suggested order to learn it later
1. frontend/index.html + css  2. js/api.js  3. js/ui.js  4. js/app.js
5. backend/server.js  6. src/db.js  7. src/middleware/*  8. src/routes/auth.js  9. src/routes/crud.js and stores.js

## Before real customers
HTTPS (deploy behind Nginx or a host like Render), PostgreSQL instead of SQLite, daily backups,
automated tests, pagination UI, password reset by email.
