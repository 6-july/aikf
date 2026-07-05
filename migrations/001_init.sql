CREATE EXTENSION IF NOT EXISTS vector;

CREATE SEQUENCE IF NOT EXISTS kb_qa_code_seq START 1;

CREATE TABLE IF NOT EXISTS kb_qa (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,

  business_domain VARCHAR(64) NOT NULL,
  audience VARCHAR(32) NOT NULL DEFAULT 'common',
  category_path VARCHAR(255),

  standard_question TEXT NOT NULL,
  similar_questions TEXT,
  answer TEXT NOT NULL,
  solution_idea TEXT,

  status VARCHAR(32) NOT NULL DEFAULT 'published',

  hit_count BIGINT NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMP,

  created_by BIGINT,
  updated_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kb_qa_index (
  id BIGSERIAL PRIMARY KEY,
  qa_id BIGINT NOT NULL REFERENCES kb_qa(id),

  business_domain VARCHAR(64) NOT NULL,
  audience VARCHAR(32) NOT NULL DEFAULT 'common',
  category_path VARCHAR(255),

  index_type VARCHAR(32) NOT NULL,
  index_text TEXT NOT NULL,
  embedding HALFVEC(2048) NOT NULL,

  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sys_config (
  config_key VARCHAR(128) PRIMARY KEY,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_qa_status ON kb_qa(status);
CREATE INDEX IF NOT EXISTS idx_kb_qa_business_domain ON kb_qa(business_domain);
CREATE INDEX IF NOT EXISTS idx_kb_qa_audience ON kb_qa(audience);
CREATE INDEX IF NOT EXISTS idx_kb_qa_category_path ON kb_qa(category_path);

CREATE INDEX IF NOT EXISTS idx_kb_qa_index_qa_id ON kb_qa_index(qa_id);
CREATE INDEX IF NOT EXISTS idx_kb_qa_index_business_domain ON kb_qa_index(business_domain);
CREATE INDEX IF NOT EXISTS idx_kb_qa_index_audience ON kb_qa_index(audience);
CREATE INDEX IF NOT EXISTS idx_kb_qa_index_status ON kb_qa_index(status);
CREATE INDEX IF NOT EXISTS idx_kb_qa_index_type ON kb_qa_index(index_type);
CREATE INDEX IF NOT EXISTS idx_kb_qa_index_embedding_hnsw
ON kb_qa_index
USING hnsw (embedding halfvec_cosine_ops);

INSERT INTO sys_config (config_key, config_value, description)
VALUES
  ('kb.search.min_score', '0.75', '知识库最小分值'),
  ('kb.search.vector_top_k', '20', '向量召回数量'),
  ('kb.search.final_top_k', '5', '最终返回数量')
ON CONFLICT (config_key) DO NOTHING;
