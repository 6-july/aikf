import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateQaDto } from './dto/create-qa.dto';
import { DuplicateCheckDto } from './dto/duplicate-check.dto';
import { GenerateSimilarQuestionsDto } from './dto/generate-similar-questions.dto';
import { ImportQaDto } from './dto/import-qa.dto';
import { SearchKnowledgeBaseDto } from './dto/search-knowledge-base.dto';
import { UpdateQaDto } from './dto/update-qa.dto';
import { KnowledgeBaseService } from './knowledge-base.service';
import { QaStatus } from './types/knowledge-base.types';

interface UploadedExcelFile {
  buffer: Buffer;
  originalname: string;
}

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get('qa')
  listQa(@Query('status') status?: QaStatus) {
    return this.knowledgeBaseService.listQa(status);
  }

  @Get('qa/:id')
  getQa(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeBaseService.getQa(id);
  }

  @Post('qa')
  createQa(@Body() dto: CreateQaDto) {
    return this.knowledgeBaseService.createQa(dto);
  }

  @Patch('qa/:id')
  updateQa(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQaDto) {
    return this.knowledgeBaseService.updateQa(id, dto);
  }

  @Post('qa/:id/offline')
  offlineQa(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeBaseService.offlineQa(id);
  }

  @Post('qa/:id/publish')
  publishQa(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeBaseService.publishQa(id);
  }

  @Delete('qa/:id')
  deleteQa(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeBaseService.deleteQa(id);
  }

  @Post('qa/:id/generate-similar-questions')
  generateSimilarQuestions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateSimilarQuestionsDto,
  ) {
    return this.knowledgeBaseService.generateSimilarQuestions(id, dto);
  }

  @Post('import')
  importQa(@Body() dto: ImportQaDto) {
    return this.knowledgeBaseService.importQa(dto.rows || []);
  }

  @Get('import-template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="kb_qa_import_template.xlsx"')
  downloadImportTemplate() {
    return new StreamableFile(this.knowledgeBaseService.buildImportTemplate());
  }

  @Post('import-excel')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  importExcel(@UploadedFile() file?: UploadedExcelFile) {
    if (!file?.buffer) {
      throw new BadRequestException('file is required');
    }

    return this.knowledgeBaseService.startImportQaFromExcelJob(
      file.buffer,
      file.originalname,
    );
  }

  @Get('import-jobs/:jobId')
  getImportJob(@Param('jobId') jobId: string) {
    return this.knowledgeBaseService.getImportJob(jobId);
  }

  @Post('rebuild-indexes')
  rebuildIndexes() {
    return this.knowledgeBaseService.rebuildIndexes();
  }

  @Post('search')
  search(@Body() dto: SearchKnowledgeBaseDto) {
    return this.knowledgeBaseService.search(dto, false);
  }

  @Post('test-search')
  testSearch(@Body() dto: SearchKnowledgeBaseDto) {
    return this.knowledgeBaseService.search(dto, true);
  }

  @Post('duplicate-check')
  checkDuplicates(@Body() dto: DuplicateCheckDto) {
    return this.knowledgeBaseService.checkDuplicates(dto);
  }
}
