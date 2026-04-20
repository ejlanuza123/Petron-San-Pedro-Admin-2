# Admin Web Dashboard

React + Vite admin dashboard for managing orders, riders, products, reports, audit logs, and operational settings for the Petron San Pedro delivery system.

## Documentation

- Developer setup: [docs/ADMIN_WEB_DEVELOPER_SETUP_GUIDE.md](docs/ADMIN_WEB_DEVELOPER_SETUP_GUIDE.md)
- Local infra + DB tools setup: [docs/LOCAL_INFRA_AND_DB_TOOLS_SETUP_GUIDE.md](docs/LOCAL_INFRA_AND_DB_TOOLS_SETUP_GUIDE.md)
- User manual: [docs/ADMIN_WEB_USER_MANUAL.md](docs/ADMIN_WEB_USER_MANUAL.md)
- Database backup guide: [docs/DATABASE_BACKUP_GUIDE.md](docs/DATABASE_BACKUP_GUIDE.md)

## What This App Does

- Manages live orders, delivery statuses, and cancellations.
- Assigns riders and tracks delivery activity.
- Handles product inventory, pricing, and low-stock monitoring.
- Shows reports, analytics, and audit logs for admin operations.
- Uses Supabase for auth, realtime updates, and PostgreSQL-backed data.

## Project Layout

- `src/` - application source code
- `public/` - static files
- `docs/` - user manuals and developer guides
- `db/migrations/` - SQL migrations for the database
- `database_schema.sql` - schema reference file
- `coverage/` - test coverage output

## Requirements

- Node.js 20.x recommended
- npm
- A Supabase project configured for this app
- A modern browser for development

## Environment Setup

Create `.env.local` from `.env.example` and fill in the values.

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not commit `.env.local`.

## Install

```bash
cd admin-web
npm install
```

## Common Commands

### Start development server

```bash
npm run dev
```

### Run tests once

```bash
npm run test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run tests with UI

```bash
npm run test:ui
```

### Run coverage

```bash
npm run test:coverage
```

### Lint the app

```bash
npm run lint
```

### Lint only tests

```bash
npm run lint:tests
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Architecture Overview

- `src/pages/` contains page-level screens like Orders, Products, Dashboard, and Reports.
- `src/components/` contains reusable UI blocks and common elements.
- `src/context/` contains shared app state providers.
- `src/hooks/` contains reusable business and data hooks.
- `src/services/` contains Supabase queries and business logic.
- `src/utils/` contains shared utilities and formatters.

## Key Technologies

- React 19
- Vite
- Tailwind CSS and PostCSS
- Supabase (PostgreSQL, Auth, Realtime)
- Vitest and Testing Library
- Vercel deployment

## Security Notes

- Authentication and role checks are enforced in the app and database.
- RLS is used at the Supabase layer.
- Sensitive values must stay in environment files.
- Admin actions are logged for auditability.

## Testing Notes

- Tests are organized under `src/__tests__/`.
- Use `npm run test` for a single pass.
- Use `npm run test:coverage` for coverage output.

## Deployment

- The app is configured for Vercel.
- `npm run vercel-build` is the production build entry.
- Set Supabase environment variables in your hosting platform before deploy.

## Database and Migrations

- Apply SQL files from `db/migrations/` in order.
- Use `database_schema.sql` as a schema reference when provisioning or reviewing changes.
- Use [docs/DATABASE_BACKUP_GUIDE.md](docs/DATABASE_BACKUP_GUIDE.md) for manual backup and restore steps.

## Troubleshooting

### App does not start

- Check Node version.
- Confirm `.env.local` values are correct.
- Reinstall dependencies if needed.

### Supabase requests fail

- Verify the project URL and anon key.
- Confirm migrations have been applied.
- Check that the user role is allowed by RLS.

### Tests or lint fail unexpectedly

- Run `npm install` again.
- Check for local environment drift.
- Review the failed test or lint output for the exact file and line.

# Deploy dist/ folder to your hosting (Netlify, AWS, Azure, etc.)
```

### Environment Variables

Create `.env.local` with:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

For production, set in deployment platform dashboard.

## Debugging

### Browser DevTools
- **Console**: Check for errors and warnings
- **Network**: Monitor Supabase API calls
- **Application**: Inspect stored tokens and cache
- **Performance**: Profile slow renders

### Supabase Dashboard
- **Logs**: Check real-time database logs for RLS violations
- **SQL Editor**: Test queries directly
- **Monitoring**: View API usage and performance metrics

## Contributing

1. Create a feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass: `npm run test`
4. Ensure linting passes: `npm run lint`
5. Create pull request with description
6. Minimum 1 approval + CI/CD green before merge


## License

Internal - Petron San Pedro Delivery System
