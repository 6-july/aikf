require('dotenv').config();

const { Client } = require('pg');

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://uu_runner:uu_runner_dev@localhost:5432/uu_runner_ai_cs';
const dimension = Number(
  process.env.ARK_EMBEDDING_DIMS ||
    process.env.EMBEDDING_DIMENSION ||
    2048,
);
const requestedStorageType = process.env.EMBEDDING_STORAGE_TYPE;
const storageType =
  requestedStorageType || (dimension > 2000 ? 'halfvec' : 'vector');
const opclass =
  storageType === 'halfvec' ? 'halfvec_cosine_ops' : 'vector_cosine_ops';

async function main() {
  if (!Number.isInteger(dimension) || dimension <= 0) {
    throw new Error('EMBEDDING_DIMENSION must be a positive integer.');
  }

  if (!['vector', 'halfvec'].includes(storageType)) {
    throw new Error('EMBEDDING_STORAGE_TYPE must be vector or halfvec.');
  }

  if (dimension > 2000 && storageType === 'vector') {
    throw new Error('vector HNSW supports at most 2000 dimensions. Use halfvec for 2048-dimensional embeddings.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query('DROP INDEX IF EXISTS idx_kb_qa_index_embedding_hnsw');
    await client.query('DELETE FROM kb_qa_index');
    await client.query(
      `ALTER TABLE kb_qa_index ALTER COLUMN embedding TYPE ${storageType}(${dimension})`,
    );
    await client.query(`
      CREATE INDEX idx_kb_qa_index_embedding_hnsw
      ON kb_qa_index
      USING hnsw (embedding ${opclass})
    `);
    await client.query('COMMIT');

    console.log(
      `kb_qa_index.embedding changed to ${storageType}(${dimension}). Active indexes were cleared; rebuild indexes after starting the API.`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
