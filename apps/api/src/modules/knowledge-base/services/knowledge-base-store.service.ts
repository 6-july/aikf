import { Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';
import { DatabaseService } from '../../../database/database.service';
import {
  BuiltIndex,
  CreateQaInput,
  KbQa,
  KbQaIndex,
  QaStatus,
  SearchCandidate,
  UpdateQaInput,
} from '../types/knowledge-base.types';

interface QaRow extends QueryResultRow {
  id: string;
  code: string;
  business_domain: string;
  audience: string;
  category_path?: string;
  standard_question: string;
  similar_questions?: string;
  answer: string;
  solution_idea?: string;
  status: QaStatus;
  hit_count: string;
  last_hit_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

interface QaIndexRow extends QueryResultRow {
  id: string;
  qa_id: string;
  business_domain: string;
  audience: string;
  category_path?: string;
  index_type: KbQaIndex['indexType'];
  index_text: string;
  embedding: string;
  status: KbQaIndex['status'];
  created_at: Date;
  updated_at: Date;
}

interface SearchIndexRow extends QueryResultRow {
  index_id: string;
  qa_id: string;
  index_type: KbQaIndex['indexType'];
  index_text: string;
  score: string;
}

@Injectable()
export class KnowledgeBaseStoreService {
  private readonly embeddingCast = this.resolveEmbeddingCast();

  constructor(private readonly database: DatabaseService) {}

  async listQa(status?: QaStatus): Promise<KbQa[]> {
    if (status === 'deleted') {
      return [];
    }

    const result = status
      ? await this.database.query<QaRow>(
          `
          SELECT *
          FROM kb_qa
          WHERE status = $1
            AND status <> 'deleted'
          ORDER BY id DESC
          `,
          [status],
        )
      : await this.database.query<QaRow>(
          `
          SELECT *
          FROM kb_qa
          WHERE status <> 'deleted'
          ORDER BY id DESC
          `,
        );

    return result.rows.map((row) => this.mapQa(row));
  }

  async getQa(id: number): Promise<KbQa> {
    const result = await this.database.query<QaRow>(
      `
      SELECT *
      FROM kb_qa
      WHERE id = $1
      `,
      [id],
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException(`QA ${id} not found`);
    }

    return this.mapQa(row);
  }

  async searchIndexes(options: {
    businessDomain: string;
    audiences: string[];
    includeInactive: boolean;
    queryEmbedding: number[];
    limit: number;
  }): Promise<SearchCandidate[]> {
    const result = await this.database.query<SearchIndexRow>(
      `
      SELECT
        i.id AS index_id,
        i.qa_id,
        i.index_type,
        i.index_text,
        1 - (i.embedding <=> $3::${this.embeddingCast}) AS score
      FROM kb_qa_index i
      WHERE ($1 = '' OR i.business_domain = $1)
        AND ('all' = ANY($2::text[]) OR i.audience = ANY($2::text[]))
        AND ($4::boolean OR i.status = 'active')
      ORDER BY i.embedding <=> $3::${this.embeddingCast}
      LIMIT $5
      `,
      [
        options.businessDomain,
        options.audiences,
        this.vectorToSql(options.queryEmbedding),
        options.includeInactive,
        options.limit,
      ],
    );

    return result.rows.map((row) => ({
      indexId: Number(row.index_id),
      qaId: Number(row.qa_id),
      indexType: row.index_type,
      indexText: row.index_text,
      score: Number(Number(row.score).toFixed(6)),
    }));
  }

  async createQa(input: CreateQaInput, builtIndexes: BuiltIndex[]): Promise<KbQa> {
    return this.database.transaction(async (client) => {
      const code = input.code ? this.cleanRequired(input.code, 'code') : await this.nextCode(client);
      const result = await client.query<QaRow>(
        `
        INSERT INTO kb_qa (
          code,
          business_domain,
          audience,
          category_path,
          standard_question,
          similar_questions,
          answer,
          solution_idea,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published')
        RETURNING *
        `,
        [
          code,
          this.clean(input.businessDomain) || '',
          this.clean(input.audience) || 'runner',
          this.clean(input.categoryPath),
          this.cleanRequired(input.standardQuestion, 'standardQuestion'),
          this.clean(input.similarQuestions) || '',
          this.cleanRequired(input.answer, 'answer'),
          this.clean(input.solutionIdea),
        ],
      );

      const qa = this.mapQa(result.rows[0]);
      await this.insertIndexesForQa(client, qa, builtIndexes);

      return qa;
    });
  }

  async updateQaOnly(id: number, patch: UpdateQaInput): Promise<KbQa> {
    return this.database.transaction(async (client) => {
      const current = await this.getQaForUpdate(client, id);
      const updated = this.mergeQa(current, patch);
      return this.updateQaRow(client, id, updated);
    });
  }

  async updateQaWithIndexes(
    id: number,
    patch: UpdateQaInput,
    builtIndexes: BuiltIndex[],
  ): Promise<KbQa> {
    return this.database.transaction(async (client) => {
      const current = await this.getQaForUpdate(client, id);
      const updatedInput = this.mergeQa(current, patch);
      const qa = await this.updateQaRow(client, id, updatedInput);
      await this.deactivateIndexes(client, id);
      await this.insertIndexesForQa(client, qa, builtIndexes);
      return qa;
    });
  }

  async offlineQa(id: number): Promise<KbQa> {
    return this.database.transaction(async (client) => {
      const qa = await this.updateStatus(client, id, 'offline');
      await this.deactivateIndexes(client, id);
      return qa;
    });
  }

  async deleteQa(id: number): Promise<KbQa> {
    return this.database.transaction(async (client) => {
      const result = await client.query<QaRow>(
        `
        UPDATE kb_qa
        SET status = 'deleted',
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [id],
      );

      const row = result.rows[0];

      if (!row) {
        throw new NotFoundException(`QA ${id} not found`);
      }

      await this.deactivateIndexes(client, id);
      return this.mapQa(row);
    });
  }

  async publishQa(id: number, builtIndexes: BuiltIndex[]): Promise<KbQa> {
    return this.database.transaction(async (client) => {
      const qa = await this.updateStatus(client, id, 'published');
      await this.deactivateIndexes(client, id);
      await this.insertIndexesForQa(client, qa, builtIndexes);
      return qa;
    });
  }

  async replaceQaIndexes(id: number, builtIndexes: BuiltIndex[]): Promise<KbQa> {
    return this.database.transaction(async (client) => {
      const qa = await this.getQaForUpdate(client, id);
      await this.deactivateIndexes(client, id);
      await this.insertIndexesForQa(client, qa, builtIndexes);
      return qa;
    });
  }

  async incrementHitCount(id: number): Promise<void> {
    await this.database.query(
      `
      UPDATE kb_qa
      SET hit_count = hit_count + 1,
          last_hit_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [id],
    );
  }

  private async getQaForUpdate(client: PoolClient, id: number): Promise<KbQa> {
    const result = await client.query<QaRow>(
      `
      SELECT *
      FROM kb_qa
      WHERE id = $1
      FOR UPDATE
      `,
      [id],
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException(`QA ${id} not found`);
    }

    return this.mapQa(row);
  }

  private async updateQaRow(
    client: PoolClient,
    id: number,
    input: CreateQaInput,
  ): Promise<KbQa> {
    const result = await client.query<QaRow>(
      `
      UPDATE kb_qa
      SET business_domain = $2,
          audience = $3,
          category_path = $4,
          standard_question = $5,
          similar_questions = $6,
          answer = $7,
          solution_idea = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        this.clean(input.businessDomain) || '',
        this.clean(input.audience) || 'runner',
        this.clean(input.categoryPath),
        this.cleanRequired(input.standardQuestion, 'standardQuestion'),
        this.clean(input.similarQuestions) || '',
        this.cleanRequired(input.answer, 'answer'),
        this.clean(input.solutionIdea),
      ],
    );

    return this.mapQa(result.rows[0]);
  }

  private async updateStatus(
    client: PoolClient,
    id: number,
    status: QaStatus,
  ): Promise<KbQa> {
    const result = await client.query<QaRow>(
      `
      UPDATE kb_qa
      SET status = $2::varchar,
          deleted_at = CASE WHEN $2::varchar = 'published' THEN NULL ELSE deleted_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [id, status],
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException(`QA ${id} not found`);
    }

    return this.mapQa(row);
  }

  private async insertIndexesForQa(
    client: PoolClient,
    qa: KbQa,
    builtIndexes: BuiltIndex[],
  ): Promise<void> {
    for (const builtIndex of builtIndexes) {
      await client.query(
        `
        INSERT INTO kb_qa_index (
          qa_id,
          business_domain,
          audience,
          category_path,
          index_type,
          index_text,
          embedding,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::${this.embeddingCast}, 'active')
        `,
        [
          qa.id,
          qa.businessDomain,
          qa.audience,
          qa.categoryPath,
          builtIndex.indexType,
          builtIndex.indexText,
          this.vectorToSql(builtIndex.embedding),
        ],
      );
    }
  }

  private async deactivateIndexes(client: PoolClient, qaId: number): Promise<void> {
    await client.query(
      `
      UPDATE kb_qa_index
      SET status = 'inactive',
          updated_at = CURRENT_TIMESTAMP
      WHERE qa_id = $1
        AND status = 'active'
      `,
      [qaId],
    );
  }

  private async nextCode(client: PoolClient): Promise<string> {
    const result = await client.query<{ code: string }>(
      `
      SELECT 'KB' || lpad(nextval('kb_qa_code_seq')::text, 6, '0') AS code
      `,
    );

    return result.rows[0].code;
  }

  private mergeQa(current: KbQa, patch: UpdateQaInput): CreateQaInput {
    return {
      businessDomain: patch.businessDomain ?? current.businessDomain,
      audience: patch.audience ?? current.audience,
      categoryPath: patch.categoryPath ?? current.categoryPath,
      standardQuestion: patch.standardQuestion ?? current.standardQuestion,
      similarQuestions: patch.similarQuestions ?? current.similarQuestions,
      answer: patch.answer ?? current.answer,
      solutionIdea: patch.solutionIdea ?? current.solutionIdea,
    };
  }

  private mapQa(row: QaRow): KbQa {
    return {
      id: Number(row.id),
      code: row.code,
      businessDomain: row.business_domain,
      audience: row.audience,
      categoryPath: row.category_path,
      standardQuestion: row.standard_question,
      similarQuestions: row.similar_questions || '',
      answer: row.answer,
      solutionIdea: row.solution_idea,
      status: row.status,
      hitCount: Number(row.hit_count),
      lastHitAt: this.toIsoString(row.last_hit_at),
      createdAt: this.toIsoString(row.created_at) || '',
      updatedAt: this.toIsoString(row.updated_at) || '',
      deletedAt: this.toIsoString(row.deleted_at),
    };
  }

  private vectorToSql(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  private resolveEmbeddingCast(): 'vector' | 'halfvec' {
    const dimension = Number(
      process.env.ARK_EMBEDDING_DIMS ||
        process.env.EMBEDDING_DIMENSION ||
        2048,
    );
    const configured = process.env.EMBEDDING_STORAGE_TYPE;

    if (configured === 'vector' || configured === 'halfvec') {
      return configured;
    }

    return dimension > 2000 ? 'halfvec' : 'vector';
  }

  private toIsoString(value?: Date): string | undefined {
    return value ? value.toISOString() : undefined;
  }

  private clean(value?: string): string | undefined {
    const cleaned = (value || '').trim().replace(/\s+/g, ' ');
    return cleaned || undefined;
  }

  private cleanRequired(value: string | undefined, field: string): string {
    const cleaned = this.clean(value);

    if (!cleaned) {
      throw new Error(`${field} is required`);
    }

    return cleaned;
  }
}
