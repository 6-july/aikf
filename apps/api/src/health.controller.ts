import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      ok: true,
      service: 'uu-runner-ai-customer-service-api',
      embeddingProvider: process.env.EMBEDDING_PROVIDER || 'local',
      embeddingDimension:
        process.env.ARK_EMBEDDING_DIMS ||
        process.env.EMBEDDING_DIMENSION ||
        '2048',
      time: new Date().toISOString(),
    };
  }
}
