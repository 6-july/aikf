# 知识库 MVP 接口说明

当前接口不做认证和授权，用于本地验证知识库流程。数据已持久化到本地 PostgreSQL + pgvector。

## 本地数据库

```bash
pnpm db:up
pnpm db:migrate
```

当前默认连接：

```text
postgresql://uu_runner:uu_runner_dev@localhost:5432/uu_runner_ai_cs
```

默认本地开发可使用 `local` provider；Ark 向量模型按 2048 维配置。由于 pgvector 的 `vector + HNSW` 最高支持 2000 维，2048 维使用 `kb_qa_index.embedding = HALFVEC(2048)`。

## QA 管理

```text
GET    /api/knowledge-base/qa
GET    /api/knowledge-base/qa/:id
POST   /api/knowledge-base/qa
PATCH  /api/knowledge-base/qa/:id
POST   /api/knowledge-base/qa/:id/offline
POST   /api/knowledge-base/qa/:id/publish
DELETE /api/knowledge-base/qa/:id
POST   /api/knowledge-base/rebuild-indexes
```

新增 QA：

```bash
curl -X POST http://localhost:3000/api/knowledge-base/qa \
  -H 'Content-Type: application/json' \
  -d '{
    "audience": "runner",
    "categoryPath": "跑男注册/注册流程",
    "standardQuestion": "注册跑男流程",
    "similarQuestions": "如何加入跑男;怎么跑单;怎么成为UU跑腿跑男",
    "answer": "下载 UU 跑腿跑男端，完成实名认证、培训考试、签约后即可接单。",
    "solutionIdea": "说明注册入口和关键步骤。"
  }'
```

## 知识库测试

```text
POST /api/knowledge-base/test-search
```

```bash
curl -X POST http://localhost:3000/api/knowledge-base/test-search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "我想加入UU跑腿怎么接单？",
    "audiences": ["common", "runner"],
    "minScore": 0.3,
    "vectorTopK": 20,
    "finalTopK": 5
  }'
```

`test-search` 支持临时调参，不会影响线上配置。

## 正式检索

```text
POST /api/knowledge-base/search
```

正式检索不允许请求覆盖检索参数，当前代码使用默认值：

```text
minScore = 0.75
vectorTopK = 20
finalTopK = 5
```

## 生成相似问法

```text
POST /api/knowledge-base/qa/:id/generate-similar-questions
```

返回候选相似问法，由客服确认后再保存到 `similarQuestions`。

## 重建索引

切换 embedding 模型或调整向量维度后，调用：

```bash
curl -X POST http://localhost:3000/api/knowledge-base/rebuild-indexes
```

该接口会读取所有 `published` QA，重新生成 active index。

## Ark Embedding

`.env` 示例：

```text
EMBEDDING_PROVIDER=ark
ARK_EMBEDDING_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_EMBEDDING_API_KEY=...
ARK_EMBEDDING_MODEL=...
ARK_EMBEDDING_DIMS=2048
ARK_EMBEDDING_API_TYPE=multi_modal_api
```

探测维度：

```bash
pnpm embedding:probe
```

按维度调整 pgvector 字段：

```bash
pnpm db:set-embedding-dimension
```
