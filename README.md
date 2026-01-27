# Costs Management

A web application for managing company fixed/operational costs by month/year.

## Features

- **Authentication**: Secure login with role-based access (Admin/User)
- **Cost Entry**: Enter costs by month for each category/item
- **User Management**: Admin can create/edit/deactivate users
- **Category Management**: Admin can manage categories, users can add items
- **Database**: PostgreSQL with Prisma ORM (compatible with PowerBI export)

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: NextAuth v5 (Auth.js)
- **Database**: PostgreSQL (Vercel Postgres / Neon) + Prisma
- **Deployment**: Vercel

## Local Development

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd costs-management
npm install
```

### 2. Set up environment variables

Copy the example env file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
# Database (Vercel Postgres / Neon)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth - generate with: openssl rand -base64 32
AUTH_SECRET="your-random-secret-here"

# Admin seed account
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
```

### 3. Set up database

Push schema to database:

```bash
npm run db:push
```

Seed initial data (categories, items, admin user):

```bash
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

### 1. Create Vercel Postgres database

1. Go to Vercel Dashboard → Storage → Create Database → Postgres
2. Copy connection strings to your Vercel project environment variables

### 2. Set environment variables in Vercel

Add these environment variables in Vercel project settings:

- `DATABASE_URL` - Postgres connection string (pooled)
- `DIRECT_URL` - Postgres direct connection string
- `AUTH_SECRET` - Random secret for NextAuth
- `ADMIN_EMAIL` - Initial admin email
- `ADMIN_PASSWORD` - Initial admin password

### 3. Deploy

```bash
vercel --prod
```

After first deploy, run seed manually (or use Vercel CLI):

```bash
npx prisma db seed
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio |

## Pages

| Route | Description | Access |
|-------|-------------|--------|
| `/login` | Login page | Public |
| `/costs` | Cost entry form | User, Admin |
| `/admin/users` | User management | Admin only |
| `/admin/categories` | Category management | Admin only |

## Data Model

```
User
├── id, email, name, passwordHash, role, isActive, timestamps

Category
├── id, name, sortOrder, timestamps
└── costItems[]

CostItem
├── id, name, categoryId, sortOrder, timestamps
└── costEntries[]

CostEntry
├── id, year, month, costItemId, amount, createdById, timestamps
└── unique: (year, month, costItemId)
```

## Roles & Permissions

| Permission | Admin | User |
|------------|-------|------|
| View/Enter costs | ✅ | ✅ |
| Add items to category | ✅ | ✅ |
| Manage categories | ✅ | ❌ |
| Manage users | ✅ | ❌ |

## License

Private
