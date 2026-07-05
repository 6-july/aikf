import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import { CreateQaDto } from './dto/create-qa.dto';
import { GenerateSimilarQuestionsDto } from './dto/generate-similar-questions.dto';
import { SearchKnowledgeBaseDto } from './dto/search-knowledge-base.dto';
import { UpdateQaDto } from './dto/update-qa.dto';
import { IndexBuilderService } from './services/index-builder.service';
import { KnowledgeBaseStoreService } from './services/knowledge-base-store.service';
import {
  CreateQaInput,
  ImportQaJobSnapshot,
  ImportQaResult,
  KbQa,
  QaStatus,
  SearchCandidate,
  SearchConfig,
  SearchMatch,
  SearchResult,
  UpdateQaInput,
} from './types/knowledge-base.types';

interface ImportQaJob extends ImportQaJobSnapshot {
  cleanupTimer?: NodeJS.Timeout;
}

@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  private readonly indexAffectingFields: Array<keyof UpdateQaInput> = [
    'businessDomain',
    'audience',
    'categoryPath',
    'standardQuestion',
    'similarQuestions',
  ];

  private readonly templateHeaders = [
    '身份',
    '一级问题类型',
    '二级问题类型',
    '三级问题类型',
    '问题（A）',
    '相似问法',
    '思路',
    '解答（Q）',
  ];

  private readonly importJobs = new Map<string, ImportQaJob>();

  constructor(
    private readonly store: KnowledgeBaseStoreService,
    private readonly indexBuilder: IndexBuilderService,
  ) {}

  async onModuleInit(): Promise<void> {
    if ((await this.store.listQa()).length > 0) {
      return;
    }

    await this.createQa({
      businessDomain: '',
      audience: 'runner',
      categoryPath: '跑男注册/注册流程',
      standardQuestion: '注册跑男流程',
      similarQuestions: '如何加入跑男;怎么跑单;怎么成为UU跑腿跑男;我想接单怎么注册',
      answer: '下载 UU 跑腿跑男端，按页面提示完成实名认证、培训考试和签约后即可接单。',
      solutionIdea: '解释注册入口和关键步骤。',
    });

    await this.createQa({
      businessDomain: '',
      audience: 'common',
      categoryPath: '平台服务/客服服务时间',
      standardQuestion: '客服服务时间',
      similarQuestions: '平台服务时间;人工客服几点上班;客服电话服务时间',
      answer: 'UU 跑腿提供 24 小时服务，热线客服服务时间以当前官方公告为准。',
      solutionIdea: '说明服务时间并避免承诺未确认信息。',
    });
  }

  listQa(status?: QaStatus): Promise<KbQa[]> {
    return this.store.listQa(status);
  }

  getQa(id: number): Promise<KbQa> {
    return this.store.getQa(id);
  }

  async createQa(dto: CreateQaDto): Promise<KbQa> {
    const input = this.normalizeCreateInput(dto);
    const builtIndexes = await this.indexBuilder.buildIndexes(input);
    return this.store.createQa(input, builtIndexes);
  }

  async importQa(
    rows: CreateQaDto[],
    rowNumbers?: number[],
    onProgress?: (progress: { processed: number; success: number; failed: number; total: number }) => void,
  ): Promise<ImportQaResult> {
    const items: KbQa[] = [];
    const errors: ImportQaResult['errors'] = [];

    for (const [index, row] of rows.entries()) {
      try {
        items.push(await this.createQa(row));
      } catch (caught) {
        errors.push({
          row: rowNumbers?.[index] || index + 1,
          message: caught instanceof Error ? caught.message : '导入失败',
        });
      }

      onProgress?.({
        processed: index + 1,
        success: items.length,
        failed: errors.length,
        total: rows.length,
      });
    }

    return {
      total: rows.length,
      success: items.length,
      failed: errors.length,
      items,
      errors,
    };
  }

  importQaFromExcel(
    buffer: Buffer,
    onProgress?: (progress: { processed: number; success: number; failed: number; total: number }) => void,
  ): Promise<ImportQaResult> {
    const rowsWithNumbers = this.parseImportRowsFromExcel(buffer);

    return this.importQa(
      rowsWithNumbers.map((row) => row.dto),
      rowsWithNumbers.map((row) => row.rowNumber),
      onProgress,
    );
  }

  startImportQaFromExcelJob(buffer: Buffer, fileName?: string): ImportQaJobSnapshot {
    const rowsWithNumbers = this.parseImportRowsFromExcel(buffer);
    const now = new Date().toISOString();
    const jobId = randomUUID();
    const job: ImportQaJob = {
      jobId,
      fileName,
      status: 'queued',
      total: rowsWithNumbers.length,
      processed: 0,
      success: 0,
      failed: 0,
      percent: 0,
      message: '等待导入',
      errors: [],
      createdAt: now,
      updatedAt: now,
    };

    this.importJobs.set(jobId, job);
    void this.runImportQaJob(jobId, rowsWithNumbers);

    return this.toImportJobSnapshot(job);
  }

  getImportJob(jobId: string): ImportQaJobSnapshot {
    const job = this.importJobs.get(jobId);

    if (!job) {
      throw new NotFoundException(`Import job ${jobId} not found`);
    }

    return this.toImportJobSnapshot(job);
  }

  parseImportRowsFromExcel(buffer: Buffer): Array<{ rowNumber: number; dto: CreateQaDto }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('Excel 中没有工作表');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
    });
    const rowsWithNumbers = rawRows
      .map((row, index) => ({
        rowNumber: index + 2,
        dto: this.excelRowToCreateQaDto(row),
      }))
      .filter((row) => this.hasImportContent(row.dto));

    if (rowsWithNumbers.length === 0) {
      throw new BadRequestException('Excel 中没有可导入的 QA 行');
    }

    return rowsWithNumbers;
  }

  buildImportTemplate(): Buffer {
    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.aoa_to_sheet([
      this.templateHeaders,
      [
        '跑男',
        '跑男注册',
        '注册流程',
        '',
        '注册跑男流程',
        '如何加入跑男;怎么跑单;怎么成为UU跑腿跑男',
        '说明注册入口和关键步骤。',
        '下载 UU 跑腿跑男端，按页面提示完成实名认证、培训考试和签约后即可接单。',
      ],
    ]);

    dataSheet['!cols'] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 26 },
      { wch: 42 },
      { wch: 32 },
      { wch: 60 },
    ];
    dataSheet['!autofilter'] = { ref: 'A1:G1' };
    dataSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

    const helpSheet = XLSX.utils.aoa_to_sheet([
      ['字段', '是否必填', '填写说明', '示例'],
      ['身份', '否', '默认跑男，支持 通用、跑男、用户，也兼容 common、runner、user', '跑男'],
      ['一级问题类型', '否', '一级分类，导入后会和二级、三级分类合并为分类路径', '跑男注册'],
      ['二级问题类型', '否', '二级分类，导入后会和一级、三级分类合并为分类路径', '注册流程'],
      ['三级问题类型', '否', '三级分类，没有可以留空', '实名认证'],
      ['问题（A）', '是', '一条 QA 的主问题', '注册跑男流程'],
      ['相似问法', '否', '支持中英文分号、换行、问号分隔', '如何加入跑男;怎么跑单'],
      ['思路', '否', '给客服维护时看的内部思路，可不填', '说明注册入口和关键步骤'],
      ['解答（Q）', '是', '最终给跑男回复的答案', '下载 UU 跑腿跑男端...'],
      ['分类路径', '兼容字段', '如果导入文件已有该列，则优先使用分类路径，格式为 一级/二级/三级', '跑男注册/注册流程'],
    ]);
    helpSheet['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 64 },
      { wch: 34 },
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, 'QA导入模板');
    XLSX.utils.book_append_sheet(workbook, helpSheet, '填写说明');

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  }

  async updateQa(id: number, dto: UpdateQaDto): Promise<KbQa> {
    const current = await this.store.getQa(id);
    const patch = this.normalizeUpdateInput(dto);

    if (Object.keys(patch).length === 0) {
      return current;
    }

    const shouldRebuildIndex = this.shouldRebuildIndex(current, patch);

    if (!shouldRebuildIndex) {
      return this.store.updateQaOnly(id, patch);
    }

    const merged: CreateQaInput = {
      ...current,
      ...patch,
    };
    const builtIndexes = await this.indexBuilder.buildIndexes(merged);

    return this.store.updateQaWithIndexes(id, patch, builtIndexes);
  }

  offlineQa(id: number): Promise<KbQa> {
    return this.store.offlineQa(id);
  }

  deleteQa(id: number): Promise<KbQa> {
    return this.store.deleteQa(id);
  }

  async publishQa(id: number): Promise<KbQa> {
    const current = await this.store.getQa(id);
    const builtIndexes = await this.indexBuilder.buildIndexes(current);
    return this.store.publishQa(id, builtIndexes);
  }

  async rebuildIndexes(): Promise<{ total: number; rebuilt: number }> {
    const qas = await this.store.listQa('published');
    let rebuilt = 0;

    for (const qa of qas) {
      const builtIndexes = await this.indexBuilder.buildIndexes(qa);
      await this.store.replaceQaIndexes(qa.id, builtIndexes);
      rebuilt += 1;
    }

    return {
      total: qas.length,
      rebuilt,
    };
  }

  async search(dto: SearchKnowledgeBaseDto, isTest: boolean): Promise<SearchResult> {
    const query = this.cleanRequired(dto.query, 'query');
    const config = this.resolveSearchConfig(dto, isTest);
    const queryEmbedding = await this.indexBuilder.embedQuery(query);

    const candidates = await this.store.searchIndexes({
      businessDomain: config.businessDomain,
      audiences: config.audiences,
      includeInactive: config.includeOffline,
      queryEmbedding,
      limit: config.vectorTopK,
    });

    const dedupedCandidates = this.dedupeByQaId(candidates)
      .filter((candidate) => candidate.score >= config.minScore)
      .sort((left, right) => right.score - left.score);

    const matchPromises = dedupedCandidates
      .map((candidate) => this.toSearchMatch(candidate, config.includeOffline));

    const matches = (await Promise.all(matchPromises))
      .filter((match): match is SearchMatch => Boolean(match))
      .slice(0, config.finalTopK);

    const bestMatch = matches[0];

    if (!isTest && bestMatch?.matched) {
      await this.store.incrementHitCount(bestMatch.qaId);
    }

    return {
      success: true,
      query,
      config,
      bestMatch,
      matches,
      candidates,
    };
  }

  async generateSimilarQuestions(id: number, dto: GenerateSimilarQuestionsDto) {
    const qa = await this.store.getQa(id);
    const limit = Math.max(1, Math.min(dto.limit || 8, 20));
    const existing = new Set(this.indexBuilder.splitSimilarQuestions(qa.similarQuestions));
    const base = qa.standardQuestion.replace(/[?？。.\s]+$/g, '');
    const core = base
      .replace(/流程|规则|说明|方式|怎么处理|怎么办/g, '')
      .trim();

    const candidates = [
      `请问${base}`,
      `${base}怎么操作`,
      `${base}怎么办`,
      `怎么${core || base}`,
      `如何${core || base}`,
      `我想了解${base}`,
      `${base}在哪里看`,
      `${base}需要什么`,
      `${base}要多久`,
      `${base}有什么要求`,
    ]
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter((item) => item && item !== qa.standardQuestion && !existing.has(item));

    return {
      qaId: qa.id,
      standardQuestion: qa.standardQuestion,
      candidates: [...new Set(candidates)].slice(0, limit),
    };
  }

  private async runImportQaJob(
    jobId: string,
    rowsWithNumbers: Array<{ rowNumber: number; dto: CreateQaDto }>,
  ): Promise<void> {
    const job = this.importJobs.get(jobId);

    if (!job) {
      return;
    }

    this.updateImportJob(job, {
      status: 'running',
      message: '正在导入知识库',
    });

    try {
      const result = await this.importQa(
        rowsWithNumbers.map((row) => row.dto),
        rowsWithNumbers.map((row) => row.rowNumber),
        (progress) => {
          this.updateImportJob(job, {
            processed: progress.processed,
            success: progress.success,
            failed: progress.failed,
            percent: Math.round((progress.processed / Math.max(progress.total, 1)) * 100),
            message: `已处理 ${progress.processed}/${progress.total} 条`,
          });
        },
      );

      this.updateImportJob(job, {
        status: 'completed',
        total: result.total,
        processed: result.total,
        success: result.success,
        failed: result.failed,
        percent: 100,
        message:
          result.failed > 0
            ? `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`
            : `导入完成：成功 ${result.success}/${result.total} 条`,
        errors: result.errors,
        completedAt: new Date().toISOString(),
      });
    } catch (caught) {
      this.updateImportJob(job, {
        status: 'failed',
        message: caught instanceof Error ? caught.message : '导入失败',
        completedAt: new Date().toISOString(),
      });
    } finally {
      this.scheduleImportJobCleanup(job);
    }
  }

  private updateImportJob(job: ImportQaJob, patch: Partial<ImportQaJobSnapshot>) {
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  }

  private scheduleImportJobCleanup(job: ImportQaJob) {
    if (job.cleanupTimer) {
      clearTimeout(job.cleanupTimer);
    }

    job.cleanupTimer = setTimeout(() => {
      this.importJobs.delete(job.jobId);
    }, 30 * 60 * 1000);
  }

  private toImportJobSnapshot(job: ImportQaJob): ImportQaJobSnapshot {
    return {
      jobId: job.jobId,
      fileName: job.fileName,
      status: job.status,
      total: job.total,
      processed: job.processed,
      success: job.success,
      failed: job.failed,
      percent: job.percent,
      message: job.message,
      errors: job.errors,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }

  private shouldRebuildIndex(current: KbQa, patch: UpdateQaInput): boolean {
    return this.indexAffectingFields.some((field) => {
      const nextValue = patch[field];
      return nextValue !== undefined && nextValue !== current[field];
    });
  }

  private dedupeByQaId(candidates: SearchCandidate[]): SearchCandidate[] {
    const bestByQaId = new Map<number, SearchCandidate>();

    for (const candidate of candidates) {
      const current = bestByQaId.get(candidate.qaId);

      if (!current || candidate.score > current.score) {
        bestByQaId.set(candidate.qaId, candidate);
      }
    }

    return [...bestByQaId.values()];
  }

  private toSearchMatch(
    candidate: SearchCandidate,
    includeOffline: boolean,
  ): Promise<SearchMatch | undefined> {
    return this.store.getQa(candidate.qaId).then((qa) => {
      if (qa.status === 'deleted') {
        return undefined;
      }

      if (!includeOffline && qa.status !== 'published') {
        return undefined;
      }

      return {
        qaId: qa.id,
        code: qa.code,
        standardQuestion: qa.standardQuestion,
        answer: qa.answer,
        matchedIndexText: candidate.indexText,
        indexType: candidate.indexType,
        score: candidate.score,
        matched: true,
      };
    });
  }

  private resolveSearchConfig(dto: SearchKnowledgeBaseDto, allowRequestConfig: boolean): SearchConfig {
    const defaultConfig = {
      minScore: 0.75,
      vectorTopK: 20,
      finalTopK: 5,
    };

    return {
      businessDomain:
        this.clean(dto.businessDomain || dto.business_domain) || '',
      audience: this.resolveAudiences(dto).join(','),
      audiences: this.resolveAudiences(dto),
      minScore: allowRequestConfig
        ? this.toNumber(dto.minScore ?? dto.min_score, defaultConfig.minScore, 0)
        : defaultConfig.minScore,
      vectorTopK: allowRequestConfig
        ? this.toNumber(dto.vectorTopK ?? dto.vector_top_k, defaultConfig.vectorTopK, 1)
        : defaultConfig.vectorTopK,
      finalTopK: allowRequestConfig
        ? this.toNumber(dto.finalTopK ?? dto.final_top_k, defaultConfig.finalTopK, 1)
        : defaultConfig.finalTopK,
      includeOffline: allowRequestConfig
        ? Boolean(dto.includeOffline ?? dto.include_offline)
        : false,
    };
  }

  private normalizeCreateInput(dto: CreateQaDto): CreateQaInput {
    return {
      code: this.clean(dto.code),
      businessDomain: this.clean(dto.businessDomain) || '',
      audience: this.clean(dto.audience) || 'runner',
      categoryPath: this.clean(dto.categoryPath),
      standardQuestion: this.cleanRequired(dto.standardQuestion, 'standardQuestion'),
      similarQuestions: this.clean(dto.similarQuestions),
      answer: this.cleanRequired(dto.answer, 'answer'),
      solutionIdea: this.clean(dto.solutionIdea),
    };
  }

  private normalizeUpdateInput(dto: UpdateQaDto): UpdateQaInput {
    const input: UpdateQaInput = {};

    for (const [key, value] of Object.entries(dto) as Array<
      [keyof UpdateQaInput, string | undefined]
    >) {
      if (value !== undefined) {
        const cleanedValue = this.clean(value);

        if (cleanedValue !== undefined) {
          input[key] = cleanedValue;
        }
      }
    }

    return input;
  }

  private toNumber(value: number | undefined, fallback: number, minimum: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < minimum) {
      return fallback;
    }

    return parsed;
  }

  private resolveAudiences(dto: SearchKnowledgeBaseDto): string[] {
    const rawAudiences = dto.audiences ?? dto.audience;
    const values = Array.isArray(rawAudiences)
      ? rawAudiences
      : String(rawAudiences || '')
          .split(/[,;；]/)
          .filter(Boolean);
    const cleanedValues = values
      .map((value) => this.clean(String(value)))
      .filter((value): value is string => Boolean(value));

    if (dto.audiences) {
      return [...new Set(cleanedValues)].length > 0
        ? [...new Set(cleanedValues)]
        : ['common', 'runner'];
    }

    const legacyAudience = cleanedValues[0] || 'runner';

    if (legacyAudience === 'all') {
      return ['all'];
    }

    return [...new Set([legacyAudience, 'common'])];
  }

  private clean(value?: string): string | undefined {
    const cleaned = (value || '').trim().replace(/\s+/g, ' ');
    return cleaned || undefined;
  }

  private cleanRequired(value: string | undefined, field: string): string {
    const cleaned = this.clean(value);

    if (!cleaned) {
      throw new BadRequestException(`${field} is required`);
    }

    return cleaned;
  }

  private excelRowToCreateQaDto(row: Record<string, unknown>): CreateQaDto {
    const primaryCategory = this.readExcelCell(row, [
      '一级问题类型',
      '一级分类',
      '一级类型',
    ]);
    const secondaryCategory = this.readExcelCell(row, [
      '二级问题类型',
      '二级分类',
      '二级类型',
    ]);
    const thirdCategory = this.readExcelCell(row, [
      '三级问题类型',
      '三级分类',
      '三级类型',
    ]);
    const categoryPath =
      this.readExcelCell(row, ['分类路径', 'categoryPath', 'category_path']) ||
      [primaryCategory, secondaryCategory, thirdCategory].filter(Boolean).join('/');

    return {
      businessDomain: this.readExcelCell(row, [
        '业务域',
        '业务',
        'businessDomain',
        'business_domain',
      ]),
      audience: this.normalizeAudience(
        this.readExcelCell(row, [
          '身份',
          '适用对象',
          '适用身份',
          'audience',
        ]),
      ),
      categoryPath,
      standardQuestion: this.readExcelCell(
        row,
        [
          '标准问题',
          '问题',
          '问题（A）',
          '问题(A)',
          'question',
          'standardQuestion',
          'standard_question',
        ],
        { prefixAliases: ['问题（A）', '问题(A)'] },
      ) || '',
      similarQuestions: this.normalizeSimilarQuestions(
        this.readExcelCell(
          row,
          [
            '相似问法',
            '相似问题',
            'similarQuestions',
            'similar_questions',
          ],
          { preserveLineBreaks: true },
        ),
      ),
      answer: this.readExcelCell(row, [
        '标准答案',
        '答案',
        '解答（Q）',
        '解答(Q)',
        '解答',
        'answer',
      ], { prefixAliases: ['解答（Q）', '解答(Q)'] }) || '',
      solutionIdea: this.readExcelCell(row, [
        '解答思路',
        '思路',
        'solutionIdea',
        'solution_idea',
      ]),
    };
  }

  private readExcelCell(
    row: Record<string, unknown>,
    aliases: string[],
    options: {
      preserveLineBreaks?: boolean;
      prefixAliases?: string[];
    } = {},
  ): string | undefined {
    const normalizedEntries = Object.entries(row).map(([key, value]) => [
      this.normalizeExcelHeader(key),
      value,
    ] as const);
    const normalizedRow = new Map(normalizedEntries);

    for (const alias of aliases) {
      const value = normalizedRow.get(this.normalizeExcelHeader(alias));
      const cleaned = this.cleanExcelValue(value, options.preserveLineBreaks);

      if (cleaned) {
        return cleaned;
      }
    }

    for (const alias of options.prefixAliases || []) {
      const normalizedAlias = this.normalizeExcelHeader(alias);
      const matchedEntry = normalizedEntries.find(([key]) => key.startsWith(normalizedAlias));
      const cleaned = this.cleanExcelValue(matchedEntry?.[1], options.preserveLineBreaks);

      if (cleaned) {
        return cleaned;
      }
    }

    return undefined;
  }

  private normalizeExcelHeader(value: string): string {
    return value
      .replace(/\s+/g, '')
      .replace(/[()（）]/g, '')
      .toLowerCase();
  }

  private cleanExcelValue(value: unknown, preserveLineBreaks = false): string | undefined {
    const raw = String(value ?? '').replace(/\r\n?/g, '\n').trim();
    const cleaned = preserveLineBreaks
      ? raw
          .split('\n')
          .map((line) => line.trim().replace(/[ \t\f\v]+/g, ' '))
          .filter(Boolean)
          .join('\n')
      : raw.replace(/\s+/g, ' ');

    return cleaned || undefined;
  }

  private normalizeSimilarQuestions(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const items = value
      .replace(/([?？])\s*/g, '$1\n')
      .split(/[;；\n\r]+/)
      .map((item) => item.trim().replace(/\s+/g, ' '))
      .filter(Boolean);

    return [...new Set(items)].join(';') || undefined;
  }

  private normalizeAudience(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    const audienceMap: Record<string, string> = {
      通用: 'common',
      跑男: 'runner',
      用户: 'user',
      商家: 'merchant',
      客服: 'customer_service',
    };

    return audienceMap[normalized] || normalized;
  }

  private hasImportContent(row: CreateQaDto): boolean {
    return Boolean(
      row.businessDomain ||
        row.audience ||
        row.categoryPath ||
        row.standardQuestion ||
        row.similarQuestions ||
        row.answer ||
        row.solutionIdea,
    );
  }
}
