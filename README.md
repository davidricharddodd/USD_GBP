# USD_GBP

Auto-converted from Floot to Railway-ready Node.js deployment.

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- npm or yarn

### Setup

1. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Create local environment file** (create `env.json` in project root)
   ```json
   {
     "FLOOT_DATABASE_URL": "postgresql://localhost/app_dev",
     "JWT_SECRET": "your-secret-key-here",
     "OPENAI_API_KEY": "your-openai-key-here"
   }
   ```

3. **Generate JWT Secret** (if needed)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Build frontend**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   ```

The server will automatically initialize the database on first run, then start on `http://localhost:3333`

**Note:** Database migrations run automatically when the server starts. On the first run, all tables, enums, and seed data will be created.

## Railway Deployment

### Step 1: Create PostgreSQL Database

1. Log in to [Railway](https://railway.app/)
2. Create a new project
3. Add a PostgreSQL service
4. Copy the connection string (available in the service variables)

### Step 2: Connect GitHub Repository

1. Push this code to GitHub
2. In Railway, connect the GitHub repository
3. Railway will auto-detect the project

### Step 3: Configure Environment Variables

Set these variables in the Railway web service settings:

**Required:**
- `FLOOT_DATABASE_URL` — PostgreSQL connection string from your Railway database service (use `${{Postgres.DATABASE_URL}}`)
- `JWT_SECRET` — Generate with `openssl rand -hex 32`
- `NODE_ENV` — Set to `production`

**Application-specific:**
   - ANTHROPIC_API_KEY
   - API_KEY
   - FLOOT_DATABASE_URL
   - FLOOT_MOBILE_APP_ID
   - FLOOT_OAUTH_CLIENT_ID
   - FLOOT_OAUTH_CLIENT_SECRET
   - JWT_SECRET
   - TELEGRAM_BOT_TOKEN
   - TELEGRAM_CHAT_ID

### Step 4: Deploy and Run

Railway will auto-deploy when you push to GitHub. The first time the app starts:

1. **Database initialization** happens automatically
   - All tables, enums, and indexes are created
   - Seed data is loaded (if included in the conversion)
   - This happens on first `npm start` before the server listens

2. **Manual migration** (optional)
   - If you need to manually run migrations: `npm run db:migrate`
   - Useful for running additional seed data or schema updates
   - Migrations are tracked to prevent re-running

To manually trigger deployment in Railway:

1. Go to the web service settings
2. Click "Deploy"

## Data Migration from Floot

If you're migrating existing data from a Floot instance:

1. **Export from Floot**
   - In Floot UI: Database view → Click cog icon → Download `pg_dump`

2. **Clean the dump**
   - Remove Neon-specific statements (already handled in migrations)
   - Remove schema DDL (table, type definitions)
   - Keep only `INSERT` statements

3. **Add to seed data**
   - Convert COPY blocks to INSERT statements
   - Place in `migrations/002-additional-seed.sql`
   - Run `npm run db:migrate` again

## Project Structure

```
.
├── src/
│   ├── components/        # React components
│   ├── pages/            # React pages
│   ├── endpoints/        # API endpoints
│   ├── helpers/          # Utility functions
│   ├── App.tsx           # Root React component
│   └── index.tsx         # React entry point
├── migrations/           # Database seed files
├── server.ts            # Hono HTTP server
├── migrate.ts           # Database initialization
├── package.json         # Dependencies
├── vite.config.ts       # Frontend build
├── .npmrc               # npm config
├── nixpacks.toml        # Railway config
├── .env.example         # Environment template
└── README.md            # This file
```

## Architecture

- **Frontend**: React with Vite (compiled to `dist/`)
- **Backend**: Hono HTTP framework on Node.js
- **Database**: PostgreSQL (managed by Railway)
- **Auth**: Session-based with JWT
- **API**: RESTful endpoints under `/_api/` prefix

## API Routes

API endpoints are dynamically routed from the `endpoints/` folder:
- `endpoints/auth/login_with_password_POST.ts` → `POST /_api/auth/login_with_password`
- `endpoints/tenders/search_GET.ts` → `GET /_api/tenders/search`

Each endpoint file exports a `handle(request: Request): Promise<Response>` function.

## Troubleshooting

### "FLOOT_DATABASE_URL not set"
Make sure you've set the environment variable in Railway. Use `${{Postgres.DATABASE_URL}}` as the variable reference.

### "Port already in use"
The default port is 3333. Set `PORT` env var to use a different port.

### "Peer dependency conflicts"
The project uses `.npmrc` with `legacy-peer-deps=true` to handle Radix UI peer deps.

## Support

For issues during deployment:
1. Check Railway logs (Deployments tab)
2. Verify environment variables are set correctly
3. Ensure database migration ran successfully
4. Check .env.example for required variables

## License

MIT - Converted from Floot with ❤️
