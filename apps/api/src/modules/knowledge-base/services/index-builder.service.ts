import { Injectable } from '@nestjs/common';
import { EmbeddingService } from '../../llm/services/embedding.service';
import { BuiltIndex, CreateQaInput } from '../types/knowledge-base.types';

@Injectable()
export class IndexBuilderService {
  constructor(private readonly embeddingService: EmbeddingService) {}

  async buildIndexes(input: CreateQaInput): Promise<BuiltIndex[]> {
    const indexes: Array<Omit<BuiltIndex, 'embedding'>> = [];
    const standardQuestion = this.clean(input.standardQuestion);
    const similarQuestions = this.splitSimilarQuestions(input.similarQuestions);
    const categoryText = this.clean((input.categoryPath || '').replace(/\//g, ' '));

    indexes.push({
      indexType: 'standard_question',
      indexText: standardQuestion,
    });

    for (const similarQuestion of similarQuestions) {
      indexes.push({
        indexType: 'manual_alias',
        indexText: similarQuestion,
      });
    }

    const categoryQuestion = [
      categoryText,
      standardQuestion,
      ...similarQuestions,
    ]
      .filter(Boolean)
      .join(' ');

    if (categoryQuestion) {
      indexes.push({
        indexType: 'category_question',
        indexText: categoryQuestion,
      });
    }

    const builtIndexes: BuiltIndex[] = [];

    for (const index of indexes.filter((item) => item.indexText.length > 0)) {
      builtIndexes.push({
        ...index,
        embedding: await this.embeddingService.embed(index.indexText),
      });
    }

    return builtIndexes;
  }

  embedQuery(query: string): Promise<number[]> {
    return this.embeddingService.embed(query);
  }

  similarity(left: number[], right: number[]): number {
    return this.embeddingService.cosineSimilarity(left, right);
  }

  splitSimilarQuestions(value?: string): string[] {
    if (!value) {
      return [];
    }

    return value
      .replace(/([?？])\s*/g, '$1\n')
      .split(/[;；\n\r]+/)
      .map((item) => this.clean(item))
      .filter(Boolean);
  }

  private clean(value?: string): string {
    return (value || '').trim().replace(/\s+/g, ' ');
  }
}
