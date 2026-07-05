export type QaStatus = 'published' | 'offline' | 'deleted';

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

export interface QaForm {
  businessDomain: string;
  audience: string;
  categoryPath: string;
  standardQuestion: string;
  similarQuestions: string;
  answer: string;
  solutionIdea: string;
}

export interface SearchCandidate {
  indexId: number;
  qaId: number;
  indexType: string;
  indexText: string;
  score: number;
}

export interface SearchMatch {
  qaId: number;
  code: string;
  standardQuestion: string;
  answer: string;
  matchedIndexText: string;
  indexType: string;
  score: number;
  matched: boolean;
}

export interface SearchResult {
  success: boolean;
  query: string;
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
