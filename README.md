# Admin Web Dashboard

A comprehensive React-based admin dashboard for managing orders, deliveries, products, and riders for the Petron San Pedro delivery application.

## Overview

The Admin Web Dashboard provides real-time order management, delivery tracking, inventory management, and comprehensive analytics for the San Pedro delivery system. It's built with React 19, Vite, and Supabase for a fast, responsive user experience.

**Key Features:**
- 📋 Real-time order management (create, update, cancel, track status)
- 🚴 Rider assignment and live GPS tracking
- 📦 Product inventory management with low-stock alerts
- 📊 Comprehensive analytics and reporting
- 🔐 Role-based access control (RBAC) with Row-Level Security (RLS)
- 🔔 Real-time notifications and updates via Supabase subscriptions
- 💳 Bulk operations (batch updates, discount application, status changes)
- 📱 Responsive design with Tailwind CSS
- ✅ Full test coverage with Vitest

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account with project configured

### Installation

```bash
# Clone and navigate to project
cd admin-web

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Update .env.local with your Supabase credentials
# VITE_SUPABASE_URL=your-supabase-url
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
# Start development server (runs on http://localhost:5173)
npm run dev

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Check code quality
npm run lint
```

### Build & Deployment

```bash
# Build for production (outputs to dist/)
npm run build

# Preview production build locally
npm run preview

# Deploy to Vercel (requires VERCEL_TOKEN)
# Automatic deployment on main branch push
```

## Architecture

### Directory Structure

```
src/
├── components/        # Reusable UI components
│   ├── common/       # Shared components (SearchBar, Pagination, etc.)
│   └── *.jsx         # Page-specific components
├── context/          # React context providers (Auth, Error, Notifications)
├── hooks/            # Custom hooks (useOrders, useProducts, useAuth, etc.)
├── pages/            # Page components (Orders, Products, Dashboard, etc.)
├── services/         # API layer (Supabase queries, business logic)
├── utils/            # Helpers (formatters, constants, validators)
├── lib/              # External library configuration (supabase.js)
├── __tests__/        # Test files (mirror src directory structure)
└── App.jsx           # Root component
```

### Key Technologies

- **Frontend Framework**: React 19 with Hooks
- **Build Tool**: Vite for fast HMR and builds
- **Styling**: Tailwind CSS with PostCSS
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: Supabase Realtime (PostgreSQL_changes)
- **Testing**: Vitest + @testing-library/react
- **Deployment**: Vercel (auto-deploy on main push)

### State Management

Uses React Context API for:
- **AuthContext**: User session, role-based access, token management
- **ErrorContext**: Application-wide error handling
- **LoadingContext**: Global loading indicators
- **NotificationContext**: Push notifications, real-time updates
- **SuccessModalContext**: Success message display

Custom hooks abstract complex state logic:
- `useOrders`: Order CRUD, real-time updates, admin logging
- `useProducts`: Product management, subscriptions
- `useAsyncOperation`: Async operation orchestration with loading/error states
- `useSessionManagement`: Inactivity tracking and auto-logout (30min)

### Security

- **Row-Level Security (RLS)**: Enforced at database layer with FORCE RLS enabled
- **Role-Based Access Control**: Admin routes protected, riders have limited access
- **Session Timeout**: 30-minute inactivity timeout with 15-second auth load timeout
- **Environment Variables**: Sensitive data stored in .env.local (never in source)
- **Audit Logging**: Admin actions logged to audit_logs table for compliance

## Testing

Comprehensive test coverage across all services, hooks, and context providers.

### Run Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with UI dashboard
npm run test:ui

# Generate coverage report (outputs to coverage/)
npm run test:coverage

# Lint test files
npm run lint:tests
```

### Test Organization

```
src/__tests__/
├── services/          # Service layer tests (API calls, business logic)
├── hooks/             # Custom hook tests
├── context/           # Context provider tests
└── pages/             # Page component tests
```

### Current Coverage

- **Overall**: 82.94% statements, 66.75% branches, 93.03% functions, 84.01% lines
- **Services**: 81.34% (analyticsService, bulkOperationsService, orderService, etc.)
- **Hooks**: 85.76% (useOrders, useProducts, useAuth, useAsyncOperation, etc.)
- **Target**: 85%+ for launch readiness

## API Layer

### Service Modules

Each service module encapsulates API calls and business logic:

- **orderService.js**: Order CRUD, status updates, delivery fee management, stats aggregation
- **productService.js**: Product inventory, stock management, real-time subscriptions
- **bulkOperationsService.js**: Batch operations, discount application, CSV export
- **analyticsService.js**: Sales metrics, order distribution, customer retention
- **filteringService.js**: Query filtering, pagination, search functionality
- **settingsService.js**: Application settings (delivery fee, config values)
- **pushNotificationService.js**: Browser notifications, Supabase subscriptions

### Error Handling

- **Try-catch blocks**: Wrap all async operations
- **ErrorContext**: Centralized error state with auto-clearing on navigation
- **Error Boundary**: Catches React rendering errors
- **Fallback values**: Graceful degradation when services fail (e.g., stats default to 0)
- **User feedback**: Error alerts with dismiss buttons

## Key Features in Detail

### Real-time Order Management
- View all orders with status filters and search
- Update order status with confirmation dialogs
- Cancel orders with cancellation notes
- Track delivery progress with GPS map
- Assign riders and view live tracking

### Rider Management
- View available riders (active only)
- Assign riders to orders
- Track rider location in real-time
- Monitor rider performance metrics

### Product Management
- Create, edit, delete products
- Track inventory with low-stock alerts
- Manage product prices and delivery fees
- View product sales metrics

### Analytics & Reporting
- Sales metrics (daily, weekly, monthly)
- Order status distribution
- Customer metrics (retention, repeat orders)
- CSV export for analysis
- Interactive charts and dashboards

### Bulk Operations
- Bulk update order status
- Apply discounts to products
- Update rider assignments
- Update delivery fees
- CSV upload/export

## Known Issues & Limitations

1. **Real-time Lag**: Supabase subscriptions may have 1-2s latency
2. **Session Timeout**: 30-minute inactivity timeout - users must re-authenticate
3. **Offline Support**: Not available (requires online connectivity)
4. **Browser Support**: Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+)
5. **Performance**: Large datasets (1000+ orders) may have UI lag - pagination recommended

## Performance Tips

1. **Pagination**: Always use pagination for large lists (default: 10 items/page)
2. **Search Before Filter**: Use search to reduce dataset before filtering
3. **Batch Operations**: Use bulk operations instead of individual updates
4. **Caching**: Browser caches responses - hard refresh (Ctrl+Shift+R) to clear
5. **Network**: Test on slow networks (DevTools throttling) - auth timeout helps

## Deployment

### Vercel (Recommended)

```bash
# 1. Connect repository to Vercel
# 2. Set environment variables in Vercel dashboard:
#    - VITE_SUPABASE_URL
#    - VITE_SUPABASE_ANON_KEY
# 3. Auto-deploys on push to main branch
```

### Operations Docs

- Deployment runbook: `DEPLOYMENT_RUNBOOK.md`
- Operations guide: `../OPERATIONS.md`

### Manual Deployment

```bash
# Build locally
npm run build

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
