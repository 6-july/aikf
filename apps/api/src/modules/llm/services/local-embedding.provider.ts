import { Injectable } from '@nestjs/common';

@Injectable()
export class LocalEmbeddingProvider {
  private readonly dimension = Number(
    process.env.EMBEDDING_DIMENSION ||
      process.env.ARK_EMBEDDING_DIMS ||
      2048,
  );

  async embed(text: string): Promise<number[]> {
    const vector = Array.from({ length: this.dimension }, () => 0);
    const tokens = this.tokenize(text);

    for (const token of tokens) {
      const index = this.hash(token) % this.dimension;
      vector[index] += token.length > 1 ? 1.4 : 1;
    }

    return this.normalize(vector);
  }

  private tokenize(text: string): string[] {
    const normalized = text
      .toLowerCase()
      .replace(/[，。！？、；：,.!?;:()[\]{}"'`~@#$%^&*_+=|\\/<>-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const tokens: string[] = [];
    const words = normalized.match(/[a-z0-9]+/g) || [];
    tokens.push(...words);

    const compact = normalized.replace(/\s+/g, '');
    for (const char of compact) {
      if (/[\u4e00-\u9fa5]/.test(char)) {
        tokens.push(char);
      }
    }

    for (let index = 0; index < compact.length - 1; index += 1) {
      const gram = compact.slice(index, index + 2);
      if (/[\u4e00-\u9fa5]/.test(gram)) {
        tokens.push(gram);
      }
    }

    return tokens.length > 0 ? tokens : [normalized || text];
  }

  private hash(value: string): number {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return Math.abs(hash >>> 0);
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

    if (magnitude === 0) {
      return vector;
    }

    return vector.map((value) => Number((value / magnitude).toFixed(8)));
  }
}
