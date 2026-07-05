# Scripts

当前脚本：

1. `db-migrate.js`：执行 `migrations/*.sql`。
2. `embedding-probe.js`：调用 Ark embedding 接口，输出向量维度。
3. `db-set-embedding-dimension.js`：按 `ARK_EMBEDDING_DIMS` 或 `EMBEDDING_DIMENSION` 调整 `kb_qa_index.embedding` 维度。

后续可放：

1. Excel QA 导入脚本。
2. 批量重建索引脚本。
3. 测试数据生成脚本。
