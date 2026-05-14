# AegisID

AegisID is an identity and access management web application that demonstrates modern authentication and authorization patterns in one place. It includes local email/password login, OAuth login, JWT sessions, TOTP two-factor authentication, recovery codes, passkeys, role-based access control, and an admin audit console.

## Main Features

- Local registration and login with Argon2id password hashing
- Google and GitHub OAuth login
- JWT access token and refresh token session flow
- TOTP authenticator app setup and verification
- One-time recovery codes stored only as hashes
- WebAuthn/passkey registration and login
- USER and ADMIN role-based access control
- Admin user management and audit logs
- Frontend form validation with React Hook Form and Zod

## Architecture

```text
Frontend:  React + Vite + React Router + Sonner + React Hook Form + Zod
Backend:   Node.js + Express + Prisma
Database:  PostgreSQL
Security:  Argon2id, JWT access tokens, refresh tokens, TOTP, WebAuthn/passkeys, RBAC
```

The frontend talks to the backend API using credentialed HTTP requests. The backend stores users, roles, refresh tokens, TOTP secrets, recovery-code hashes, WebAuthn credentials, and audit logs in PostgreSQL. Authentication state is handled with short-lived access tokens and rotating refresh tokens stored in HTTP-only cookies.

## Setup

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Configure backend environment

Create `backend/.env` from this template:

```env
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://aegisid:aegisid_password@localhost:5432/aegisid_db
JWT_ACCESS_SECRET=replace_with_long_random_secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:4000/api/auth/github/callback
TOTP_SECRET_ENCRYPTION_KEY=replace_with_base64_32_byte_key
TOTP_ISSUER=AegisID
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=AegisID
WEBAUTHN_ORIGIN=http://localhost:5173
```

Generate a valid `TOTP_SECRET_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

For OAuth testing, create OAuth apps in Google and GitHub, then paste the client IDs and secrets into `backend/.env`.

Callback URLs:

```text
Google: http://localhost:4000/api/auth/google/callback
GitHub: http://localhost:4000/api/auth/github/callback
```

### 3. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 4. Prepare the database

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5. Run the app

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

## Testing Credentials

Seeded accounts use this password:

```text
aegisid-demo-password
```

Accounts:

```text
admin@aegisid.test       ADMIN
maya.user@aegisid.test   USER
linh@aegisid.test        USER
```

## Useful Commands

Backend:

```bash
cd backend
npm test
npm run build
npx prisma validate
npx prisma migrate status
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```
