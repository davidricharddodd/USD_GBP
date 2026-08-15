import fs from 'fs'

try {
  const envConfig = JSON.parse(fs.readFileSync('env.json', 'utf8'));
  Object.keys(envConfig).forEach(key => {
    if (!process.env[key]) {
      process.env[key] = envConfig[key];
    }
  });
} catch {
  // env.json not found — using environment variables directly (e.g. Railway)
}
