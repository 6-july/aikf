# UU跑男智能客服知识库技术方案

日期：2026-07-04

## 1. 背景与范围

公司客服当前以 Excel 维护跑男客服 QA，典型字段包括：身份、一级问题类型、二级问题类型、问题、相似问法、思路、解答。系统需要将这批 QA 迁移到后台维护，并为智能客服提供稳定的知识库检索能力。

本方案只覆盖 AI 客服管理后台中的知识库部分。业务查询能力由 Agent + Tool 实现，知识库作为只读 Tool 提供 `search_knowledge_base` 能力。

一期目标：

1. 支持 Excel QA 导入。
2. 支持后台单条新增、编辑保存即生效、下线、删除。
3. 支持相似问法用英文分号 `;` 分隔维护。
4. 支持单条 QA 修改后只重建该条检索索引。
5. 使用 PostgreSQL + pgvector + HNSW 做向量检索。
6. 提供知识库测试页面，便于客服验证召回效果。
7. `business_domain` 字段和接口逻辑保留，但一期不在页面和模板中展示；当前主要通过 `audience` 控制适用对象。

一期非目标：

1. 不做复杂审核流。
2. 不做版本回滚。
3. 不做长文档切片。
4. 不把完整答案作为主向量索引。
5. 不提供手动“同步知识库”按钮。
6. 不做定时生效和自动过期。

## 2. 核心设计

知识库分为两层：

```text
kb_qa
  客服维护的原始 QA

kb_qa_index
  系统根据 QA 生成的检索索引
```

关系：

```text
kb_qa 1 条 -> kb_qa_index 多条
```

用户问题检索流程：

```text
用户问题
  -> 生成 query embedding
  -> 按 active / audience 检索 kb_qa_index.embedding
  -> 得到候选 index
  -> 按 qa_id 聚合去重
  -> 回查 kb_qa
  -> 返回 kb_qa.answer
```

产品体验采用“保存即生效”：客服新增或编辑 QA 后，系统自动重建该条 QA 的检索索引；保存成功后线上立即使用新版知识。删除和下线均会将对应索引置为 `inactive`。

后台定位为 AI 客服管理后台，MVP 菜单建议：

```text
工作台
智能体
知识库
会话
系统设置
```

MVP 不建设多个物理知识库，也不做多知识库绑定。统一使用一套 `kb_qa` + `kb_qa_index`。`business_domain` 作为后续多业务隔离字段预留，一期默认空值，不作为客服维护项。

## 3. 表结构

### 3.1 QA 主表：kb_qa

一行 Excel 对应一条 `kb_qa`。

```sql
CREATE TABLE kb_qa (
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
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| code | 知识编号，如 `KB000001` |
| business_domain | 预留业务域，一期默认空值，后台不展示 |
| audience | 适用对象，如 `common`、`runner` |
| category_path | 分类路径，如 `跑男注册/注册流程` |
| standard_question | 标准问题，对应 Excel 的“问题（A）” |
| similar_questions | 相似问法，使用英文分号 `;` 分隔 |
| answer | 标准答案，对应 Excel 的“解答（Q）” |
| solution_idea | 解答思路，内部备注，不展示给用户，不参与主检索 |
| status | 知识状态 |
| hit_count | 线上最佳命中次数 |
| last_hit_at | 最近一次线上最佳命中时间 |

### 3.2 检索索引表：kb_qa_index

`kb_qa_index` 由系统生成，客服不直接维护。

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE kb_qa_index (
  id BIGSERIAL PRIMARY KEY,
  qa_id BIGINT NOT NULL REFERENCES kb_qa(id),

  business_domain VARCHAR(64) NOT NULL,
  audience VARCHAR(32) NOT NULL DEFAULT 'common',
  category_path VARCHAR(255),

  index_type VARCHAR(32) NOT NULL,
  index_text TEXT NOT NULL,
  embedding VECTOR(1536),

  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

注意：`VECTOR(1536)` 需要和实际 embedding 模型维度一致。

`kb_qa_index` 冗余 `business_domain`、`audience`、`category_path`，用于向量检索时直接过滤，避免召回阶段频繁关联 `kb_qa`。这些字段在保存 QA 时从 `kb_qa` 同步到索引表；一期 `business_domain` 默认空值，检索时不对客服开放配置。

索引表不保存答案快照。命中后再根据 `qa_id` 回查 `kb_qa` 获取当前标准答案，这样编辑答案保存后即可立即使用新版答案。

## 4. 枚举与字段职责

### 4.1 business_domain

`business_domain` 表示知识所属业务，用于后续多业务隔离。

一期先不启用业务域：

```text
business_domain = ''
```

保留逻辑：

```text
1. 数据库字段保留。
2. 接口入参保留。
3. Excel 导入仍兼容“业务域”列。
4. 索引表仍冗余 business_domain。
```

但客服后台、Excel 模板和知识库测试页面均不展示业务域。后续如接入用户、商家等多业务，再恢复业务域配置。

### 4.2 audience

`audience` 表示知识适用对象，用于对象隔离。

| 值 | 说明 |
| --- | --- |
| common | 通用 |
| runner | 跑男 |
| user | 用户 |
| merchant | 商家 |
| customer_service | 客服内部 |

一期建议只启用：

```text
common
runner
```

职责区分：

```text
business_domain：这条知识属于哪个业务线，一期隐藏并默认空
audience：这条知识适合哪个对象使用
```

例如：

```text
business_domain = ''
audience = runner
```

### 4.3 kb_qa.status

| 值 | 说明 | 是否参与问答 |
| --- | --- | --- |
| published | 正常可用 | 是 |
| offline | 已下线 | 否 |
| deleted | 已删除，软删 | 否 |

如果后续需要草稿能力，可扩展 `draft`，但一期主流程按“保存即生效”处理。

### 4.4 kb_qa_index.index_type

| 值 | 说明 | 一期建议 |
| --- | --- | --- |
| standard_question | 标准问题 | 必做 |
| manual_alias | 客服维护的相似问法 | 有则生成 |
| category_question | 分类 + 标准问题 + 相似问法 | 必做 |
| answer_summary | 答案关键字或摘要 | 可选 |

### 4.5 kb_qa_index.status

| 值 | 说明 | 是否参与检索 |
| --- | --- | --- |
| active | 生效 | 是 |
| inactive | 失效 | 否 |

## 5. 分类路径

分类统一使用 `category_path`，用 `/` 分隔层级：

```text
一级分类/二级分类/三级分类
```

示例：

```text
平台服务/客服服务时间
跑男注册/注册流程
跑男注册/注册流程/实名认证
收入提现/提现问题/提现失败
```

规则：

1. 分类名本身不允许包含 `/`。
2. 每层入库前需要 `trim`。
3. 建议最多 3 层，避免维护过深。
4. Excel 原一级、二级分类导入时合并为 `category_path`。

查询示例：

```sql
-- 查完整分类
WHERE category_path = '跑男注册/注册流程'

-- 查某一级分类下全部知识
WHERE category_path = '跑男注册'
   OR category_path LIKE '跑男注册/%'

-- 查某二级分类下全部知识
WHERE category_path = '跑男注册/注册流程'
   OR category_path LIKE '跑男注册/注册流程/%'
```

## 6. 索引生成

每条 QA 生成多条 `kb_qa_index`。

示例 QA：

```text
business_domain = ''
audience = runner
category_path = 跑男注册/注册流程
standard_question = 注册跑男流程
similar_questions = 如何加入跑男;怎么跑单;怎么成为UU跑腿跑男
answer = 下载 UU 跑腿跑男端，完成实名认证、培训考试、签约后即可接单……
```

生成索引：

| index_type | index_text |
| --- | --- |
| standard_question | 注册跑男流程 |
| manual_alias | 如何加入跑男 |
| manual_alias | 怎么跑单 |
| manual_alias | 怎么成为UU跑腿跑男 |
| category_question | 跑男注册 注册流程 注册跑男流程 如何加入跑男 怎么跑单 怎么成为UU跑腿跑男 |
| answer_summary | 跑男注册 下载跑男端 实名认证 培训考试 签约 接单 |

生成规则：

1. `standard_question` 必生成。
2. `manual_alias` 按 `similar_questions` 用 `;` 拆分，有多少生成多少。
3. `category_question` 将 `category_path` 的 `/` 替换为空格，再拼接标准问题和相似问法。
4. `answer_summary` 可选，不直接使用完整答案向量化。

答案是最终返回内容，不是主召回入口。完整答案通常包含多个步骤和关键词，直接向量化容易造成误召回；如相似问法不足，可用答案摘要或关键词作为补充索引。

## 7. 向量检索

使用 pgvector 存储 embedding，并在 `embedding` 字段上建立 HNSW 索引。

```sql
CREATE INDEX idx_kb_qa_index_embedding_hnsw
ON kb_qa_index
USING hnsw (embedding vector_cosine_ops);
```

基础查询：

```sql
SELECT
  i.id AS index_id,
  i.qa_id,
  i.index_type,
  i.index_text,
  1 - (i.embedding <=> :query_embedding) AS score
FROM kb_qa_index i
WHERE i.status = 'active'
  AND (:business_domain = '' OR i.business_domain = :business_domain)
  AND i.audience = ANY(:audiences)
ORDER BY i.embedding <=> :query_embedding
LIMIT :vector_top_k;
```

`embedding <=> :query_embedding` 为 cosine distance，距离越小越相似：

```text
score = 1 - distance
```

普通索引建议：

```sql
CREATE INDEX idx_kb_qa_status ON kb_qa(status);
CREATE INDEX idx_kb_qa_business_domain ON kb_qa(business_domain);
CREATE INDEX idx_kb_qa_audience ON kb_qa(audience);
CREATE INDEX idx_kb_qa_category_path ON kb_qa(category_path);
CREATE INDEX idx_kb_qa_index_qa_id ON kb_qa_index(qa_id);
CREATE INDEX idx_kb_qa_index_business_domain ON kb_qa_index(business_domain);
CREATE INDEX idx_kb_qa_index_audience ON kb_qa_index(audience);
CREATE INDEX idx_kb_qa_index_status ON kb_qa_index(status);
CREATE INDEX idx_kb_qa_index_type ON kb_qa_index(index_type);
```

## 8. 检索配置

检索参数复用现有 `sys_config`，不新建知识库配置表。

| 配置 key | 页面名称 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `kb.search.min_score` | 最小分值 | `0.75` | 低于该值认为未命中 |
| `kb.search.vector_top_k` | 向量召回数量 | `20` | 先召回多少条 index 候选 |
| `kb.search.final_top_k` | 最终返回数量 | `5` | 去重过滤后返回多少条 QA |

一期不引入 `enabled_index_types` 和 `index_type_weights`：

```text
所有 active 的 kb_qa_index 都参与检索
所有 index_type 权重都等于 1
final_score = vector_score
```

配置读取优先级：

```text
线上正式问答：sys_config > code default
知识库测试接口：request param > sys_config > code default
```

说明：

1. 线上正式问答接口不允许传临时调参字段，只使用 `sys_config > code default`。
2. 知识库测试接口允许传临时参数，只作用于本次测试，不落库，不影响线上。

## 9. 检索流程

```text
用户问题
  -> 生成 query embedding
  -> 带 active / audience 条件检索 kb_qa_index
  -> 按 vector_top_k 召回 index 候选
  -> 按 qa_id 聚合去重，保留最高 score
  -> 过滤 score < min_score 的候选
  -> 按 score 排序
  -> 回查 kb_qa，兜底要求 status = published
  -> 返回 final_top_k 条 QA
```

示例：

```text
vector_top_k = 20
final_top_k = 5
min_score = 0.75
```

带索引状态和身份条件召回 20 条 index 候选后，按 `qa_id` 去重，低于 `min_score` 的候选丢弃，再回查 `kb_qa.answer`，最终返回最多 5 条 QA。`business_domain` 逻辑保留，默认空值时不参与过滤。

召回阶段只依赖 `kb_qa_index`，不关联 `kb_qa`；回查答案阶段再校验 `kb_qa.status = published`，防止异常数据被返回。

## 10. 保存、下线、删除与索引同步

客服新增或编辑 QA 时，保存成功即生效。保存过程需要保证 `kb_qa` 与 `kb_qa_index` 一致。

核心原则：

1. `kb_qa` 是主数据，`kb_qa_index` 是系统生成的派生索引。
2. 不建议先改 `kb_qa_index` 再改 `kb_qa`。
3. embedding 调用放在数据库事务外，避免外部接口慢或失败时长时间占用数据库事务。
4. `kb_qa` 和 `kb_qa_index` 的数据库写入必须放在同一个事务里，任一步失败都整体回滚。
5. 如果 embedding 失败，保存失败，旧线上结果保持不变。

### 10.1 新增 QA

```text
新增 QA
  -> 根据当前表单内容生成 index_text
  -> 调 embedding 模型生成向量
  -> embedding 成功后开启事务
  -> insert kb_qa，得到 qa_id
  -> insert kb_qa_index，status = active
  -> 提交事务
```

如果 `kb_qa_index` 写入失败，事务回滚，`kb_qa` 也不会新增成功。

### 10.2 编辑 QA

编辑时先判断本次修改是否影响检索索引。

影响索引的字段：

```text
business_domain
audience
category_path
standard_question
similar_questions
```

如果启用了 `answer_summary` 索引，答案摘要相关内容变化也需要重建索引。

不影响索引的字段：

```text
answer
solution_idea
```

如果客服只修改 `answer` 或 `solution_idea`，不需要重建 `kb_qa_index`，只更新 `kb_qa` 即可。因为 `kb_qa_index` 不保存答案快照，命中后会回查 `kb_qa.answer` 获取最新答案。

影响索引字段的编辑流程：

```text
编辑 QA
  -> 根据新表单内容生成 index_text
  -> 调 embedding 模型生成新向量
  -> embedding 成功后开启事务
  -> update kb_qa
  -> 将当前 qa_id 的旧 kb_qa_index 置 inactive
  -> insert 新 kb_qa_index，status = active
  -> 提交事务
```

只修改答案或内部备注的编辑流程：

```text
编辑 QA
  -> 开启事务
  -> update kb_qa.answer / kb_qa.solution_idea
  -> 提交事务
```

旧索引置为失效：

```sql
UPDATE kb_qa_index
SET status = 'inactive',
    updated_at = CURRENT_TIMESTAMP
WHERE qa_id = :qa_id;
```

### 10.3 下线和删除

下线不需要重新生成 embedding：

```text
下线 QA
  -> 开启事务
  -> update kb_qa.status = offline
  -> update 当前 qa_id 的 active kb_qa_index.status = inactive
  -> 提交事务
```

删除采用软删：

```text
删除 QA
  -> 开启事务
  -> update kb_qa.status = deleted
  -> update kb_qa.deleted_at = 当前时间
  -> update 当前 qa_id 的 active kb_qa_index.status = inactive
  -> 提交事务
```

### 10.4 重新上线

重新上线需要按当前 `kb_qa` 内容重新生成 active 索引：

```text
重新上线 QA
  -> 根据当前 kb_qa 内容生成 index_text
  -> 调 embedding 模型生成向量
  -> embedding 成功后开启事务
  -> update kb_qa.status = published
  -> 将当前 qa_id 的旧 kb_qa_index 置 inactive
  -> insert 新 kb_qa_index，status = active
  -> 提交事务
```

### 10.5 并发控制建议

后台编辑保存时建议带上 `updated_at` 或版本号做乐观锁校验，避免两个客服同时编辑同一条 QA 时互相覆盖。

## 11. Excel 导入

系统导入需要兼容两类 Excel：

1. 后台下载的标准模板，字段尽量贴近客服原始表格。
2. 客服当前维护的原始表格。

客服原始表格无需手动改列名，导入时按别名做字段映射：

| Excel 列 | kb_qa 字段 |
| --- | --- |
| 身份 | audience |
| 一级问题类型 + 二级问题类型 | category_path |
| 问题（A） | standard_question |
| 相似问法 | similar_questions |
| 思路 | solution_idea |
| 解答（Q）或以“解答（Q）”开头的长标题 | answer |

兼容字段：

| Excel 列 | kb_qa 字段 | 说明 |
| --- | --- | --- |
| 业务域 | business_domain | 一期模板不提供；如果历史文件带该列，导入逻辑仍保留 |

后台下载模板建议使用以下列：

```text
身份
一级问题类型
二级问题类型
三级问题类型
问题（A）
相似问法
思路
解答（Q）
```

`三级问题类型` 可以为空。`业务域` MVP 不展示在模板里，但导入逻辑仍兼容该字段，后续多业务接入时可恢复显示。

分类合并规则：

```text
一级问题类型 = 跑男注册
二级问题类型 = 注册流程
=> category_path = 跑男注册/注册流程
```

导入成功后默认 `status = published`，并自动生成 active 索引；如果后续需要人工确认，可扩展草稿能力。

导入清洗规则：

1. `身份` 映射为系统枚举：通用 = `common`，跑男 = `runner`，用户 = `user`。
2. 一级、二级、三级问题类型按 `/` 合并为 `category_path`；如果已有 `分类路径`，优先使用 `分类路径`。
3. `相似问法` 支持中英文分号、换行、问号作为分隔，导入后统一保存为英文分号 `;` 分隔。
4. `思路` 保存为 `solution_idea`，用于客服内部参考，不参与主召回。
5. `解答（Q）` 表头如果带有“转人工专属后缀”等说明，只要以 `解答（Q）` 开头，仍识别为标准答案列。

## 12. Agent 与 Query Rewrite

知识库只负责检索，不负责理解上下文。调用知识库前，由 Agent 完成：

1. 上下文理解。
2. 指代消解。
3. Query Rewrite。

示例：

```text
用户：多久？
Agent Rewrite：注册跑男审核需要多久？
```

随后 Agent 调用知识库：

```text
search_knowledge_base(query)
```

知识库只接收最终检索问题，不处理多轮上下文。

## 13. Agent Tool 接入

知识库作为只读 Tool：

```text
search_knowledge_base
```

入参：

```json
{
  "query": "怎么注册跑男？",
  "audience": "runner",
  "top_k": 5
}
```

出参：

```json
{
  "success": true,
  "matches": [
    {
      "qa_id": 1001,
      "question": "注册跑男流程",
      "answer": "注册签约流程非常简单，完成以下步骤……",
      "matched_index_text": "怎么成为UU跑腿跑男",
      "index_type": "manual_alias",
      "score": 0.89,
      "matched": true
    }
  ]
}
```

Agent 规则：

1. 规则、流程、政策、FAQ 类问题优先调用知识库。
2. 账户、认证、收入、订单、提现等个人数据问题调用业务 Tool。
3. 业务 Tool 结果需要解释规则时，再调用知识库。
4. 未达到 `min_score` 时，不允许编造答案，应追问、转人工或进入未命中池。

## 14. 智能体配置 MVP

MVP 支持多个智能体，例如：

```text
跑男客服
用户客服
商家客服，后续
```

每个智能体配置：

1. 名称。
2. System Prompt。
3. Model。
4. 默认 `audience`。
5. 可用 Tool。

一期不支持：

1. 多知识库绑定。
2. Workflow 编排。
3. 页面化配置 `business_domain`。

统一使用一个知识库，一期通过 `audience` 控制知识适用对象；`business_domain` 字段保留但默认空值。

## 15. 知识库测试页面

测试页面用于客服、运营、研发验证召回效果。该页面不需要单独建表，实时调用检索接口即可。

页面输入：

```text
用户问题：必填
适用对象：多选，支持 common / runner / user
最小分值：默认线上配置，可临时调整
向量召回数量：默认线上配置，可临时调整
最终返回数量：默认线上配置，可临时调整
是否包含下线知识：默认否
```

`include_offline` 仅用于测试接口排查问题，线上正式检索不包含下线或删除知识。

页面输出：

```text
最佳命中 QA
命中索引文本
命中索引类型
相似度分数
是否达到最小分值
TopN 候选
最终标准答案
```

测试接口：

```text
POST /api/kb/test-search
```

请求：

```json
{
  "query": "我想加入UU跑腿怎么接单？",
  "audiences": ["common", "runner"],
  "min_score": 0.65,
  "vector_top_k": 30,
  "final_top_k": 10,
  "include_offline": false
}
```

返回：

```json
{
  "query": "我想加入UU跑腿怎么接单？",
  "best_match": {
    "qa_id": 1001,
    "code": "KB000123",
    "standard_question": "注册跑男流程",
    "answer": "注册签约流程非常简单……",
    "matched_index_text": "怎么成为UU跑腿跑男",
    "index_type": "manual_alias",
    "score": 0.89,
    "matched": true
  },
  "candidates": []
}
```

页面操作：

1. 查看 QA。
2. 编辑 QA。
3. 复制当前测试问题为相似问法。
4. 重新生成该 QA 索引。
5. 加入未命中问题池，可后续再做。

“复制为相似问法”直接追加到 `kb_qa.similar_questions`，然后重建该 QA 的索引。

## 16. AI 生成相似问法

为降低客服维护成本，后台可提供“生成相似问法”辅助能力。

入口建议放在 QA 新增和编辑页面：

```text
标准问题
分类路径
标准答案
已有相似问法
```

系统调用大模型生成 5 到 10 条候选相似问法。客服可以勾选、编辑、删除候选项，确认后追加到 `kb_qa.similar_questions`。

处理规则：

1. 生成结果不自动生效，必须由客服确认保存。
2. 保存后按正常 QA 保存流程重建该条 `kb_qa_index`。
3. 生成时要求问题口语化、短句化，避免改写答案内容。
4. 已存在的相似问法需要去重。
5. 不生成涉及金额、时效、政策承诺的新信息。

示例：

```text
standard_question = 注册跑男流程

AI 候选：
如何加入跑男
怎么成为 UU 跑腿跑男
我想接单要怎么注册
跑男端在哪里申请
```

该功能只辅助扩充召回入口，不改变标准答案。

## 17. 命中次数与线上召回统计

一期在 `kb_qa` 上直接维护命中次数：

```text
hit_count
last_hit_at
```

命中定义：

```text
线上正式检索中，经过过滤、按 qa_id 去重、min_score 判断后，排名第一的 QA，算命中一次。
```

计数规则：

```text
best_match 存在
  -> best_match.qa_id 的 hit_count + 1
  -> last_hit_at = 当前时间
```

不计入命中次数：

1. 知识库测试页面的测试请求。
2. TopN 候选里非第一名的 QA。
3. `score < min_score` 的候选。
4. Agent 最终是否使用该答案，一期不单独统计。

更新 SQL：

```sql
UPDATE kb_qa
SET hit_count = hit_count + 1,
    last_hit_at = CURRENT_TIMESTAMP
WHERE id = :best_qa_id;
```

建议异步更新命中次数，避免影响问答耗时。

二期如需更细的召回分析，可新增 `kb_search_log`，用于统计命中率、未命中率、热门命中 QA、低分问题、转人工率和检索耗时。

```sql
CREATE TABLE kb_search_log (
  id BIGSERIAL PRIMARY KEY,

  request_id VARCHAR(64),
  session_id VARCHAR(64),
  user_id BIGINT,
  business_domain VARCHAR(64),
  audience VARCHAR(32),

  query_text TEXT,
  min_score NUMERIC(5,4),
  vector_top_k INT,
  final_top_k INT,

  hit BOOLEAN NOT NULL,
  best_qa_id BIGINT,
  best_qa_code VARCHAR(64),
  best_score NUMERIC(6,4),
  matched_index_type VARCHAR(32),
  matched_index_text TEXT,

  returned_qa_ids TEXT,
  transferred_to_human BOOLEAN,

  latency_ms INT,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

`query_text` 可能包含手机号、订单号等敏感信息，写入前需要脱敏。

如后续需要测试历史和人工标注，再考虑单独增加 `kb_search_test_log`。

## 18. 回答策略

默认优先直接返回 `kb_qa.answer`。如需要模型润色，必须限制模型只能基于标准答案表达，不允许扩展政策、金额、时间或承诺。

```text
命中 QA
  -> 取 kb_qa.answer
  -> 直接返回，或让模型基于标准答案润色
```

## 19. 文档知识库，二期

一期仅支持 QA。后续支持 Word、PDF、Markdown 等长文档时，新增独立模块：

```text
kb_document
kb_doc_chunk
kb_doc_chunk_index
```

文档知识库采用切片方案，不复用 `kb_qa`。当前 Excel QA 已经是小颗粒知识：

```text
一行 QA = 一个知识单元
```

因此一期不做长文档切片。如果某行答案很长且包含多个主题，应让客服拆成多条 QA。

## 20. 一期范围

必做：

1. `kb_qa` 表。
2. `kb_qa_index` 表。
3. Excel 导入。
4. 后台单条新增、编辑保存即生效、下线、删除。
5. `standard_question`、`manual_alias`、`category_question` 索引生成。
6. pgvector + HNSW 向量检索。
7. 复用 `sys_config` 配置 `min_score`、`vector_top_k`、`final_top_k`。
8. 知识库测试页面。
9. 作为 Agent 的 `search_knowledge_base` Tool。
10. `kb_qa.hit_count` 与 `last_hit_at` 命中统计。
11. `audience` 检索过滤；`business_domain` 预留隔离逻辑。
12. 智能体基础配置。

可选：

1. `answer_summary` 索引。
2. AI 自动生成相似问法。
3. 未命中问题池。
4. `kb_search_log` 线上召回明细日志。
5. 文档知识库。

## 21. 总结

核心链路：

```text
客服维护 kb_qa
  -> 系统生成 kb_qa_index
  -> 用户问题匹配 kb_qa_index
  -> 命中 qa_id
  -> 返回 kb_qa.answer
```

本方案保持知识库主数据简单、检索索引自动生成、检索参数可配置、测试页面可调试，适合当前 UU 跑男客服 QA 场景。
