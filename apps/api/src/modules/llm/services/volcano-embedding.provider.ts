import { BadRequestException, Injectable } from '@nestjs/common';
import { fetch } from 'undici';

interface EmbeddingResponse {
  data?:
    | Array<{
        embedding?: number[];
      }>
    | {
        embedding?: number[];
      };
}

@Injectable()
export class VolcanoEmbeddingProvider {
  async embed(text: string): Promise<number[]> {
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

    if (!baseUrl || !apiKey || !model) {
      throw new BadRequestException(
        'Ark embedding is not configured. Please set ARK_EMBEDDING_BASE_URL, ARK_EMBEDDING_API_KEY and ARK_EMBEDDING_MODEL.',
      );
    }

    const body: Record<string, unknown> = {
      model,
      input: this.buildInput(text, apiType),
    };

    if (Number.isInteger(dimensions) && dimensions > 0) {
      body.dimensions = dimensions;
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${this.resolvePath(apiType)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new BadRequestException(`Volcano embedding request failed: ${detail}`);
    }

    const payload = (await response.json()) as EmbeddingResponse;
    const embedding = Array.isArray(payload.data)
      ? payload.data[0]?.embedding
      : payload.data?.embedding;

    if (!embedding || embedding.length === 0) {
      throw new BadRequestException('Volcano embedding response has no embedding.');
    }

    return embedding;
  }

  private buildInput(text: string, apiType: string): unknown {
    if (apiType === 'multi_modal_api') {
      return [
        {
          type: 'text',
          text,
        },
      ];
    }

    return text;
  }

  private resolvePath(apiType: string): string {
    if (apiType === 'multi_modal_api') {
      return '/embeddings/multimodal';
    }

    return '/embeddings';
  }
}
