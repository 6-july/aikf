import { Module } from '@nestjs/common';
import { EmbeddingService } from './services/embedding.service';
import { LocalEmbeddingProvider } from './services/local-embedding.provider';
import { VolcanoEmbeddingProvider } from './services/volcano-embedding.provider';

@Module({
  providers: [EmbeddingService, LocalEmbeddingProvider, VolcanoEmbeddingProvider],
  exports: [EmbeddingService],
})
export class LlmModule {}

