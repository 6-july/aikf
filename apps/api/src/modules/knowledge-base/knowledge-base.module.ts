import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { IndexBuilderService } from './services/index-builder.service';
import { KnowledgeBaseStoreService } from './services/knowledge-base-store.service';

@Module({
  imports: [LlmModule],
  controllers: [KnowledgeBaseController],
  providers: [
    KnowledgeBaseService,
    KnowledgeBaseStoreService,
    IndexBuilderService,
  ],
})
export class KnowledgeBaseModule {}
