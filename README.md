# UU Runner AI Customer Service

UU 跑男智能客服 MVP。

当前阶段只实现知识库验证能力，不包含认证、授权、真实业务 Tool。数据库使用本地 Docker PostgreSQL + pgvector，embedding 默认使用本地简易 provider。

## 目录

```text
apps/
  api/      NestJS API，当前只实现知识库模块
  admin/    管理后台占位，后续实现 QA 管理和测试页面
  web/      跑男侧/用户侧聊天入口占位
packages/
  shared/   共享类型和枚举占位
docs/       技术文档
scripts/    初始化、导入、重建索引脚本占位
```

## 本地启动 API

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev:api
```

API 默认启动在：

```text
http://localhost:3000/api
```

## 知识库测试

健康检查：

```bash
curl http://localhost:3000/api/health
```

测试召回：

```bash
curl -X POST http://localhost:3000/api/knowledge-base/test-search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "我想加入UU跑腿怎么接单？",
    "businessDomain": "runner_service",
    "audience": "runner",
    "minScore": 0.3,
    "vectorTopK": 20,
    "finalTopK": 5
  }'
```

## 当前实现说明

当前 API 使用 PostgreSQL + pgvector 和本地简易向量算法，用于验证：

1. QA 新增、编辑、下线、删除。
2. `kb_qa` 与 `kb_qa_index` 的关系。
3. 标准问题、相似问法、分类增强索引生成。
4. 知识库测试召回。
5. 只修改答案时不重建索引。

后续接火山 Ark 向量模型时，配置 `.env`：

```text
EMBEDDING_PROVIDER=ark
ARK_EMBEDDING_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_EMBEDDING_API_KEY=...
ARK_EMBEDDING_MODEL=...
ARK_EMBEDDING_DIMS=2048
ARK_EMBEDDING_API_TYPE=multi_modal_api
```

当前 Ark embedding 按 2048 维配置。由于 pgvector 的 `vector + HNSW` 最高支持 2000 维，本项目对 2048 维使用 `HALFVEC(2048) + halfvec_cosine_ops`。如需确认 Ark 实际返回维度，可执行：

```bash
pnpm embedding:probe
```

如后续更换模型，需要同步修改 `.env`：

```text
ARK_EMBEDDING_DIMS=实际维度
```

调整本地 pgvector 字段：

```bash
pnpm db:set-embedding-dimension
```

该命令会清空 `kb_qa_index`，保留 `kb_qa` 主数据。启动 API 后重建索引：

```bash
curl -X POST http://localhost:3000/api/knowledge-base/rebuild-indexes
```

## 数据库

启动本地 PostgreSQL + pgvector：

```bash
pnpm db:up
```

执行迁移：

```bash
pnpm db:migrate
```

调整 embedding 维度：

```bash
pnpm db:set-embedding-dimension
```

进入 psql：

```bash
pnpm db:psql
```
