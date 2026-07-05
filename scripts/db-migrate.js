const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'migrations');
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://uu_runner:uu_runner_dev@localhost:5432/uu_runner_ai_cs';

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Running migration: ${file}`);
      await client.query(sql);
    }

    console.log('Database migrations completed.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

