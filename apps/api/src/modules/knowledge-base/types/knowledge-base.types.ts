export type QaStatus = 'published' | 'offline' | 'deleted';
export type QaIndexStatus = 'active' | 'inactive';

export type IndexType =
  | 'standard_question'
  | 'manual_alias'
  | 'category_question'
  | 'answer_summary';

export interface KbQa {
  id: number;
  code: string;
  businessDomain: string;
  audience: string;
  categoryPath?: string;
  standardQuestion: string;
  similarQuestions: string;
  answer: string;
  solutionIdea?: string;
  status: QaStatus;
  hitCount: number;
  lastHitAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface KbQaIndex {
  id: number;
  qaId: number;
  businessDomain: string;
  audience: string;
  categoryPath?: string;
  indexType: IndexType;
  indexText: string;
  embedding: number[];
  status: QaIndexStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQaInput {
  code?: string;
  businessDomain?: string;
  audience?: string;
  categoryPath?: string;
  standardQuestion: string;
  similarQuestions?: string;
  answer: string;
  solutionIdea?: string;
}

export interface UpdateQaInput {
  businessDomain?: string;
  audience?: string;
  categoryPath?: string;
  standardQuestion?: string;
  similarQuestions?: string;
  answer?: string;
  solutionIdea?: string;
}

export interface BuiltIndex {
  indexType: IndexType;
  indexText: string;
  embedding: number[];
}

export interface SearchConfig {
  businessDomain: string;
  audience: string;
  audiences: string[];
  minScore: number;
  vectorTopK: number;
  finalTopK: number;
  includeOffline: boolean;
}

export interface SearchCandidate {
  indexId: number;
  qaId: number;
  indexType: IndexType;
  indexText: string;
  score: number;
}

export interface SearchMatch {
  qaId: number;
  code: string;
  standardQuestion: string;
  answer: string;
  matchedIndexText: string;
  indexType: IndexType;
  score: number;
  matched: boolean;
}

export interface SearchResult {
  success: boolean;
  query: string;
  config: SearchConfig;
  bestMatch?: SearchMatch;
  matches: SearchMatch[];
  candidates: SearchCandidate[];
}

export interface ImportQaError {
  row: number;
  message: string;
}

export interface ImportQaResult {
  total: number;
  success: number;
  failed: number;
  items: KbQa[];
  errors: ImportQaError[];
}

export type ImportQaJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ImportQaJobSnapshot {
  jobId: string;
  fileName?: string;
  status: ImportQaJobStatus;
  total: number;
  processed: number;
  success: number;
  failed: number;
  percent: number;
  message: string;
  errors: ImportQaError[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
