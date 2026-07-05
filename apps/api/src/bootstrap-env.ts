import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const candidateEnvFiles = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
];

for (const envFile of candidateEnvFiles) {
  if (existsSync(envFile)) {
    config({ path: envFile, override: false });
  }
}

