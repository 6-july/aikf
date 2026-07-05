import { Injectable } from '@nestjs/common';
import { LocalEmbeddingProvider } from './local-embedding.provider';
import { VolcanoEmbeddingProvider } from './volcano-embedding.provider';

@Injectable()
export class EmbeddingService {
  constructor(
    private readonly localProvider: LocalEmbeddingProvider,
    private readonly volcanoProvider: VolcanoEmbeddingProvider,
  ) {}

  embed(text: string): Promise<number[]> {
    const provider = process.env.EMBEDDING_PROVIDER || 'local';

    if (provider === 'ark' || provider === 'volcano') {
      return this.volcanoProvider.embed(text);
    }

    return this.localProvider.embed(text);
  }

  cosineSimilarity(left: number[], right: number[]): number {
    const length = Math.min(left.length, right.length);
    let sum = 0;

    for (let index = 0; index < length; index += 1) {
      sum += left[index] * right[index];
    }

    return Number(sum.toFixed(6));
  }
}
