import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';

@Module({
  imports: [DatabaseModule, KnowledgeBaseModule],
  controllers: [HealthController],
})
export class AppModule {}
