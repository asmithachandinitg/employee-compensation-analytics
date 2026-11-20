# Peoplewise — Employee Compensation & Analytics Platform

A full-stack employee compensation and analytics platform built to manage employee information, track salary changes, and visualize workforce and compensation insights.

## Overview

Peoplewise is a web-based application designed to help organizations manage employee records and understand compensation patterns across departments and countries.

The platform provides an employee directory, compensation history, an analytics dashboard, and workforce-level insights. It uses a relational database and includes seed data for 10,000 employees.

## Key Features

### Dashboard
- View overall employee statistics.
- Monitor active employee counts.
- View department and country summaries.
- Explore payroll information grouped by currency.

### Employee Management
- Browse employee records.
- Search employees.
- Filter by department, country, and employment status.
- Navigate employee records using pagination.
- View individual employee details.

### Compensation Management
- View compensation records.
- Review an employee's compensation history.
- Update employee salary information.
- Record effective dates and reasons for compensation changes.
- Maintain historical compensation records.

### Analytics
- Analyze compensation across departments.
- Explore country-level compensation information.
- Review salary distribution bands.
- Understand employee tenure distribution.
- Apply department, country, and currency filters.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Build tool | Vite |
| Backend | Node.js, Express |
| Language | TypeScript |
| Database | PostgreSQL 18 |
| ORM | Prisma 6 |
| API validation | Zod |
| Backend testing | Vitest, Supertest |
| Frontend testing | Vitest, React Testing Library |
| Styling | CSS |

## Architecture

The application follows a client-server architecture.

```text
React + TypeScript Frontend
          |
          | HTTP / REST API
          |
Node.js + Express Backend
          |
          | Prisma ORM
          |
     PostgreSQL
```

The frontend communicates with the backend through REST endpoints. The backend validates requests, executes database operations through Prisma, and returns JSON responses.

## Project Structure

```text
employee-compensation-analytics/
│
├── client/
│   └── client/
│       ├── src/
│       │   ├── components/
│       │   ├── context/
│       │   ├── pages/
│       │   ├── services/
│       │   ├── test/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── lib/
│   │   ├── routes/
│   │   ├── app.ts
│   │   └── index.ts
│   ├── prisma/
│   ├── package.json
│   └── vitest.config.ts
│
└── README.md
```

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- PostgreSQL
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/asmithachandinitg/employee-compensation-analytics.git

cd employee-compensation-analytics
```

### 2. Configure the backend

```bash
cd server
npm install
```

Configure the backend environment variables in a `.env` file. Set the PostgreSQL connection string using the variable expected by the Prisma configuration.

Example connection string format:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME"
PORT=5000
```

### 3. Set up the database

Run the project's Prisma migrations:

```bash
npx prisma migrate deploy
```

Generate the Prisma client if required:

```bash
npx prisma generate
```

Seed the database using the seed command configured in the project.

### 4. Start the backend

```bash
npm run dev
```

The backend runs on the configured port (5000 by default).

### 5. Configure and start the frontend

Open another terminal:

```bash
cd client/client
npm install
npm run dev
```

Vite will display the local frontend URL in the terminal.

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health check |
| GET | `/api/dashboard/summary` | Dashboard summary |
| GET | `/api/dashboard/analytics` | Compensation and workforce analytics |
| GET | `/api/employees` | Paginated employee list |
| GET | `/api/employees/filters` | Employee filter options |
| GET | `/api/employees/:id` | Employee details |
| GET | `/api/compensation` | Compensation records |
| GET | `/api/compensation/filters` | Compensation filter options |
| GET | `/api/compensation/:employeeId/history` | Employee compensation history |
| POST | `/api/compensation/:employeeId` | Add a compensation record |

## Testing

### Backend

```bash
cd server
npm test
```

Backend tests cover employee, dashboard, and compensation route behaviour.

**Current reported result:** 25 tests passing.

### Frontend

```bash
cd client/client
npm test
```

### Production builds

Frontend:

```bash
cd client/client
npm run build
```

Backend:

```bash
cd server
npm run build
```

## Seed Data

The project includes seed data for 10,000 employees to support realistic pagination, filtering, dashboard summaries, and analytics scenarios.

## Design Considerations

- Separation of frontend and backend responsibilities.
- Relational data storage using PostgreSQL.
- Prisma ORM for structured database access.
- Request validation for API inputs.
- Pagination to support larger employee datasets.
- Historical compensation records rather than overwriting salary history.
- Database-level aggregation for analytics.

## Deployment

- Frontend URL: [Add deployed frontend URL]
- Backend URL: [Add deployed backend URL]
- Database: PostgreSQL

## Future Improvements

Potential extensions include role-based access control, more advanced compensation reporting, export functionality, and additional employee management workflows.

## Author

Developed as part of a full-stack engineering assessment.

**Repository:** https://github.com/asmithachandinitg/employee-compensation-analytics
