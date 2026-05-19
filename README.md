# 🦷 OdontoSync — Backend API

Welcome to the standalone backend API for **OdontoSync**, a modern dental clinic management system. This application is built as a high-performance RESTful API using Fastify, TypeScript, and Prisma ORM, backed by a cloud-hosted PostgreSQL database on Neon DB.

---

## 🛠️ Technology Stack

- **Runtime & Language:** Node.js (TSX) & TypeScript (Strict Mode)
- **Web Framework:** [Fastify](https://fastify.dev/) (High-performance, low-overhead web framework)
- **Database & ORM:** PostgreSQL & [Prisma ORM](https://www.prisma.io/)
- **Security:** JSON Web Tokens (JWT) & Fastify CORS middleware
- **Development Tooling:** TSX (TypeScript Execute) & watch mode

---

## 📂 Directory Structure

```text
Backend/
├── prisma/
│   ├── schema.prisma       # Database models & Prisma configurations
│   └── migrations/         # SQL migration history
├── src/
│   ├── lib/
│   │   └── prisma.ts       # Centralized Prisma Client instance
│   ├── modules/            # Domain-driven modules
│   │   ├── appointments/   # Appointment creation, listing, status updates
│   │   ├── auth/           # Authentication endpoints & RBAC middlewares
│   │   ├── clinic/         # Clinic configuration rules
│   │   └── patients/       # Patient accounts & search logic
│   ├── types/
│   │   └── fastify.d.ts    # Custom Fastify type augmentations (JWT User)
│   ├── seed.ts             # Complete database seed script with mock data
│   └── server.ts           # Server initialization, CORS, JWT & Route registrations
├── .env.example            # Example configuration file
├── .gitignore              # Ignored system and local configuration files
├── package.json            # NPM scripts & dependencies
└── tsconfig.json           # Strict TypeScript configuration
```

---

## ⚙️ Setup & Configuration

### 1. Pre-requisites
Make sure you have [Node.js](https://nodejs.org/) (v18+) and `npm` installed.

### 2. Install Dependencies
Navigate to the backend directory and run:
```bash
npm install
```

### 3. Database Environment Variables
Create a `.env` file in the root of the `Backend/` directory by copying `.env.example`:
```bash
cp .env.example .env
```
Open the newly created `.env` file and insert your Neon DB connection string and JWT secret:
```env
DATABASE_URL="postgresql://<username>:<password>@<neon-host>/odontosync?sslmode=require"
JWT_SECRET="your-super-secure-jwt-secret-key"
```

---

## 🚀 Commands & Database Operations

### Development Server
Start the API server in watch mode:
```bash
npm run dev
```
The API will be running on `http://localhost:3333`.

### Database Migrations
Deploy the database schema to your cloud Neon DB instance:
```bash
npx prisma db push
```
Or to run proper migration files during changes:
```bash
npx prisma migrate dev --name <migration-name>
```

### Seed Database
Seed your cloud database with clinical configurations, admin accounts, patients, and structured appointment data:
```bash
npx ts-node src/seed.ts
```
*(Alternatively, run the pre-configured script if available in package.json).*

---

## 🔒 Security & Best Practices

1. **Role-Based Access Control (RBAC):** Crucial administrative routes (like setting clinical configurations or listing comprehensive appointments) are strictly protected by the `requireAdmin` middleware.
2. **Environment Variables Safety:** The `.env` file is excluded from version control in `.gitignore` to prevent any sensitive credentials from leaking.
3. **Soft Delete & Tracking:** Per project rules, deletion operations only modify `status` fields to preserve database history and integrity.
