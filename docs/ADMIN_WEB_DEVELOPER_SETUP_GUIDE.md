# Admin Web Developer Setup Guide

This guide helps new developers set up the Petron San Pedro admin web application locally.

## Overview

The admin web app is a React + Vite dashboard for managing orders, riders, products, reports, and app settings. It uses Supabase for authentication, database access, and realtime updates.

## Prerequisites

- Node.js 20.x recommended
- npm
- Git
- A Supabase project with the database already provisioned
- A modern browser for development and testing

## Folder Structure

- `src/` - source code
- `public/` - static assets
- `docs/` - manuals and guides
- `db/migrations/` - SQL migration files
- `database_schema.sql` - reference schema file

## Install

```powershell
cd C:\Projects\admin-web
npm install
```

## Environment Setup

Copy `.env.example` or create `.env.local` and update the values.

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not commit `.env.local`.

## Run the App

Start the dev server:

```powershell
npm run dev
```

The app usually runs on `http://localhost:5173`.

## Testing

Run all tests once:

```powershell
npm run test
```

Run tests in watch mode:

```powershell
npm run test:watch
```

Run coverage:

```powershell
npm run test:coverage
```

## Linting

Run ESLint:

```powershell
npm run lint
```

Lint test files only:

```powershell
npm run lint:tests
```

## Production Build

Build the app:

```powershell
npm run build
```

Preview the production build:

```powershell
npm run preview
```

## Deployment Notes

- The app is configured for Vercel.
- `npm run vercel-build` maps to the production build.
- Set the Supabase environment variables in your hosting platform.

## Supabase Setup Notes

- Use the same Supabase project referenced by the app environment file.
- Apply SQL migrations from `db/migrations/` when provisioning or updating the database.
- Make sure RLS policies match the expected admin access patterns.

## Common Tasks

### Reset the dev environment

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

### Rebuild after environment changes

```powershell
npm run build
```

### Re-run tests after a change

```powershell
npm run test
```

## Troubleshooting

### App fails to start

- Confirm Node version.
- Check `.env.local` values.
- Reinstall dependencies if needed.

### Supabase calls fail

- Check project URL and anon key.
- Confirm the database migrations are applied.
- Verify RLS policies and user roles.

### Tests fail unexpectedly

- Run `npm run lint` first.
- Clear the cache by deleting `node_modules` and reinstalling if dependency versions drifted.

## Helpful Docs

- `docs/ADMIN_WEB_USER_MANUAL.md`
- `docs/DATABASE_BACKUP_GUIDE.md`
- `README.md`
