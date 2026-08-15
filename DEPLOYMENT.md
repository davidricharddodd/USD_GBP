# Railway Deployment Step-by-Step

## Prerequisites
- GitHub account with this repository pushed
- Railway account (free tier available)

## Steps

### 1. Create a Railway Project
```
https://railway.app → New Project → Create
```

### 2. Add PostgreSQL Service
- Click on your project
- Add Service → PostgreSQL
- Wait for the database to be created

### 3. Connect GitHub Repository
- Add Service → GitHub Repo
- Select this repository
- Railway will auto-detect the Node.js project

### 4. Configure Environment Variables

In the web service settings, add:

| Variable | Value |
|----------|-------|
| `FLOOT_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Generate with `openssl rand -hex 32` |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

### 5. Deploy and Database Initialization

Railway will automatically deploy. On the first deployment:

1. The app starts and automatically initializes the database
   - All tables, enums, and indexes are created
   - Seed data loads (if included)
2. Migrations are tracked in the `_migrations` table to prevent re-running
3. The server then listens for requests

**Optional:** To manually run migrations later:
- Railway Shell: `npm run db:migrate`
- Or use Railway's one-off command feature

### 6: Verify Deployment

- Check the deployment logs in Railway
- Visit the application URL provided by Railway
- Check database connection in Railway postgres logs

## Common Issues

### "Exit code 1" during build
- Check if npm install is failing due to peer dependencies
- Make sure TypeScript is compiling (npm run build)

### "Connection refused" to database
- Verify DATABASE_URL is set to `${{Postgres.DATABASE_URL}}`
- Wait for PostgreSQL service to be fully initialized

### "Migration timeout"
- Increase the command timeout in Railway settings
- Or run migration before main deployment

## After Deployment

1. Connect your domain to Railway (optional)
2. Enable auto-deploy on GitHub pushes (Railway → Triggers)
3. Monitor logs and metrics in Railway dashboard
4. Set up error tracking (e.g., Sentry)

## Rollback

To rollback to a previous deployment:
- In Railway, go to Deployments
- Click the previous successful deployment
- Click "Redeploy"
