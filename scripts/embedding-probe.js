require('dotenv').config();
const { fetch } = require('undici');

const baseUrl =
  process.env.ARK_EMBEDDING_BASE_URL ||
  process.env.VOLCANO_EMBEDDING_BASE_URL;
const apiKey =
  process.env.ARK_EMBEDDING_API_KEY ||
  process.env.ARK_API_KEY ||
  process.env.VOLCANO_EMBEDDING_API_KEY;
const model =
  process.env.ARK_EMBEDDING_MODEL ||
  process.env.VOLCANO_EMBEDDING_MODEL;
const dimensions = Number(
  process.env.ARK_EMBEDDING_DIMS ||
    process.env.EMBEDDING_DIMENSION ||
    0,
);
const apiType = process.env.ARK_EMBEDDING_API_TYPE || 'text_api';

async function main() {
  if (!baseUrl || !apiKey || !model) {
    throw new Error(
      'Please set ARK_EMBEDDING_BASE_URL, ARK_EMBEDDING_API_KEY and ARK_EMBEDDING_MODEL in .env.',
    );
  }

  const body = {
    model,
    input:
      apiType === 'multi_modal_api'
        ? [{ type: 'text', text: '注册跑男流程' }]
        : '注册跑男流程',
  };

  if (Number.isInteger(dimensions) && dimensions > 0) {
    body.dimensions = dimensions;
  }

  const path = apiType === 'multi_modal_api' ? '/embeddings/multimodal' : '/embeddings';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Embedding request failed: ${detail}`);
  }

  const payload = await response.json();
  const embedding = Array.isArray(payload && payload.data)
    ? payload.data[0] && payload.data[0].embedding
    : payload && payload.data && payload.data.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error('Embedding response has no data[0].embedding array.');
  }

  console.log(`Embedding dimension: ${embedding.length}`);
  console.log(`Configured dimension: ${dimensions || '(not set)'}`);
  console.log(`API type: ${apiType}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
