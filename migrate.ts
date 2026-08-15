import "./loadEnv.js";
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.FLOOT_DATABASE_URL || process.env.DATABASE_URL;
let sql: any;

export async function migrate() {
  if (!dbUrl) {
    console.warn("⚠️ No DATABASE_URL or FLOOT_DATABASE_URL environment variable was found. Skipping database migration.");
    return;
  }

  console.log("Running database migration...");
  
  // Test connection with retry logic
  const maxRetries = 10;
  const retryIntervalMs = 3000;
  let retries = 0;
  let sqlTest: any = null;

  while (retries < maxRetries) {
    try {
      sqlTest = postgres(dbUrl, { max: 1 });
      await sqlTest`SELECT 1`;
      await sqlTest.end();
      break;
    } catch (err: any) {
      retries++;
      console.warn(`⚠️ Database connection attempt ${retries}/${maxRetries} failed: ${err.message}. Retrying in ${retryIntervalMs / 1000}s...`);
      if (sqlTest) {
        try { await sqlTest.end(); } catch (e) {}
      }
      if (retries >= maxRetries) {
        console.error("✗ Could not connect to the database after maximum retries.");
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
    }
  }

  sql = postgres(dbUrl, { max: 1 });

  try {
    // Fix any character(n) columns that may exist from older schema migrations
  try { await sql.unsafe('CREATE SEQUENCE IF NOT EXISTS exchange_rates_id_seq OWNED BY exchange_rates.id'); } catch(e) {}
  try { await sql.unsafe('ALTER TABLE exchange_rates ALTER COLUMN id SET DEFAULT nextval(\'exchange_rates_id_seq\'::regclass)'); } catch(e) { /* already set */ }
  try { await sql.unsafe('CREATE SEQUENCE IF NOT EXISTS fx_forecasts_id_seq OWNED BY fx_forecasts.id'); } catch(e) {}
  try { await sql.unsafe('ALTER TABLE fx_forecasts ALTER COLUMN id SET DEFAULT nextval(\'fx_forecasts_id_seq\'::regclass)'); } catch(e) { /* already set */ }
  try { await sql.unsafe('ALTER TABLE fx_forecasts ALTER COLUMN summary TYPE text USING summary::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('CREATE SEQUENCE IF NOT EXISTS login_attempts_id_seq OWNED BY login_attempts.id'); } catch(e) {}
  try { await sql.unsafe('ALTER TABLE login_attempts ALTER COLUMN id SET DEFAULT nextval(\'login_attempts_id_seq\'::regclass)'); } catch(e) { /* already set */ }
  try { await sql.unsafe('ALTER TABLE login_attempts ALTER COLUMN email TYPE text USING email::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('CREATE SEQUENCE IF NOT EXISTS oauth_accounts_id_seq OWNED BY oauth_accounts.id'); } catch(e) {}
  try { await sql.unsafe('ALTER TABLE oauth_accounts ALTER COLUMN id SET DEFAULT nextval(\'oauth_accounts_id_seq\'::regclass)'); } catch(e) { /* already set */ }
  try { await sql.unsafe('ALTER TABLE oauth_accounts ALTER COLUMN provider TYPE text USING provider::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('ALTER TABLE oauth_accounts ALTER COLUMN provider_user_id TYPE text USING provider_user_id::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('ALTER TABLE oauth_accounts ALTER COLUMN provider_email TYPE text USING provider_email::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('CREATE SEQUENCE IF NOT EXISTS oauth_states_id_seq OWNED BY oauth_states.id'); } catch(e) {}
  try { await sql.unsafe('ALTER TABLE oauth_states ALTER COLUMN id SET DEFAULT nextval(\'oauth_states_id_seq\'::regclass)'); } catch(e) { /* already set */ }
  try { await sql.unsafe('ALTER TABLE oauth_states ALTER COLUMN state TYPE text USING state::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('ALTER TABLE oauth_states ALTER COLUMN code_verifier TYPE text USING code_verifier::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('ALTER TABLE oauth_states ALTER COLUMN provider TYPE text USING provider::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('ALTER TABLE oauth_states ALTER COLUMN redirect_url TYPE text USING redirect_url::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('CREATE SEQUENCE IF NOT EXISTS rate_alerts_id_seq OWNED BY rate_alerts.id'); } catch(e) {}
  try { await sql.unsafe('ALTER TABLE rate_alerts ALTER COLUMN id SET DEFAULT nextval(\'rate_alerts_id_seq\'::regclass)'); } catch(e) { /* already set */ }
  try { await sql.unsafe('ALTER TABLE sessions ALTER COLUMN id TYPE text USING id::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('CREATE SEQUENCE IF NOT EXISTS user_passwords_id_seq OWNED BY user_passwords.id'); } catch(e) {}
  try { await sql.unsafe('ALTER TABLE user_passwords ALTER COLUMN id SET DEFAULT nextval(\'user_passwords_id_seq\'::regclass)'); } catch(e) { /* already set */ }
  try { await sql.unsafe('ALTER TABLE user_passwords ALTER COLUMN password_hash TYPE text USING password_hash::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('CREATE SEQUENCE IF NOT EXISTS users_id_seq OWNED BY users.id'); } catch(e) {}
  try { await sql.unsafe('ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval(\'users_id_seq\'::regclass)'); } catch(e) { /* already set */ }
  try { await sql.unsafe('ALTER TABLE users ALTER COLUMN email TYPE text USING email::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('ALTER TABLE users ALTER COLUMN display_name TYPE text USING display_name::text'); } catch(e) { /* already correct */ }
  try { await sql.unsafe('ALTER TABLE users ALTER COLUMN avatar_url TYPE text USING avatar_url::text'); } catch(e) { /* already correct */ }

    // Check if migrations have already run by checking for _migrations table
    let migrationCompleted = false;
    try {
      await sql`SELECT 1 FROM _migrations LIMIT 1`;
      migrationCompleted = true;
    } catch (e) {
      // _migrations table does not exist yet
    }

    if (!migrationCompleted) {
      // Create enum types
  // Create enum: alert_direction
  try {
    await sql.unsafe("DO $$ BEGIN CREATE TYPE alert_direction AS ENUM ('at_or_below', 'at_or_above'); EXCEPTION WHEN duplicate_object THEN null; END $$;");
  } catch (e) { /* enum may already exist */ }

  // Create enum: forecast_direction
  try {
    await sql.unsafe("DO $$ BEGIN CREATE TYPE forecast_direction AS ENUM ('bullish', 'bearish', 'neutral'); EXCEPTION WHEN duplicate_object THEN null; END $$;");
  } catch (e) { /* enum may already exist */ }

  // Create enum: user_role
  try {
    await sql.unsafe("DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'user'); EXCEPTION WHEN duplicate_object THEN null; END $$;");
  } catch (e) { /* enum may already exist */ }


      // Create tables
  // Create table: exchange_rates

  await sql`
    CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL NOT NULL,
  rate numeric(10,6) NOT NULL,
  fetched_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
    );
  `;

  // Create table: fx_forecasts

  await sql`
    CREATE TABLE IF NOT EXISTS fx_forecasts (
  id SERIAL NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  confidence_pct integer NOT NULL,
  direction forecast_direction NOT NULL,
  summary text NOT NULL,
  rate_path jsonb NOT NULL,
  key_events jsonb NOT NULL,
  target_range_low numeric(10,6) NOT NULL,
  target_range_high numeric(10,6) NOT NULL,
  current_rate_at_forecast numeric(10,6) NOT NULL,
  PRIMARY KEY (id)
    );
  `;

  // Create table: login_attempts

  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL NOT NULL,
  email text NOT NULL,
  attempted_at timestamp with time zone,
  success boolean DEFAULT false NOT NULL,
  PRIMARY KEY (id)
    );
  `;

  // Create table: oauth_accounts

  await sql`
    CREATE TABLE IF NOT EXISTS oauth_accounts (
  id SERIAL NOT NULL,
  user_id integer NOT NULL,
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  provider_email text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (provider, provider_user_id)
    );
  `;

  // Create table: oauth_states

  await sql`
    CREATE TABLE IF NOT EXISTS oauth_states (
  id SERIAL NOT NULL,
  state text NOT NULL,
  code_verifier text DEFAULT ''::text NOT NULL,
  provider text NOT NULL,
  redirect_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (state)
    );
  `;

  // Create table: rate_alerts

  await sql`
    CREATE TABLE IF NOT EXISTS rate_alerts (
  id SERIAL NOT NULL,
  target_rate numeric(10,6) NOT NULL,
  direction alert_direction DEFAULT 'at_or_below'::alert_direction NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  triggered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
    );
  `;

  // Create table: sessions

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
  id text NOT NULL,
  user_id integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_accessed timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
    );
  `;

  // Create table: user_passwords

  await sql`
    CREATE TABLE IF NOT EXISTS user_passwords (
  id SERIAL NOT NULL,
  user_id integer NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (user_id)
    );
  `;

  // Create table: users

  await sql`
    CREATE TABLE IF NOT EXISTS users (
  id SERIAL NOT NULL,
  email text NOT NULL,
  display_name text DEFAULT ''::character varying NOT NULL,
  avatar_url text,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (email),
  PRIMARY KEY (id)
    );
  `;

      // Add foreign key constraints
  try { await sql.unsafe('ALTER TABLE oauth_accounts ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'); } catch(e) { /* may already exist */ }
  try { await sql.unsafe('ALTER TABLE sessions ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'); } catch(e) { /* may already exist */ }
  try { await sql.unsafe('ALTER TABLE user_passwords ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'); } catch(e) { /* may already exist */ }

      // Create indexes


      // Create migration tracking table
      await sql`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
    }

    // Run seed data from migrations folder
    const migrationsDir = path.join(__dirname, "migrations");
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
      
      for (const file of files) {
        // Check if this migration has already run
        let alreadyRun = false;
        try {
          const result = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`;
          if (result.length > 0) {
            alreadyRun = true;
          }
        } catch (e) {
          // Table may not exist yet
        }

        if (!alreadyRun) {
          console.log(`Running migration: ${file}`);
          const migrationSql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
          await sql.unsafe(migrationSql);
          
          // Record that this migration was run
          try {
            await sql`INSERT INTO _migrations (name) VALUES (${file})`;
          } catch (e) {
            // Migration already recorded
          }
        }
      }
    }

    console.log("✓ Database migration completed successfully!");
  } catch (error) {
    console.error("✗ Migration failed:", error);
    throw error;
  }
}

// If run as standalone script (npm run db:migrate), exit after migration
if (import.meta.url === ("file://" + process.argv[1])) {
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}
