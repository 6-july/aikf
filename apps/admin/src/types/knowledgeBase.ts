import type {
  DuplicateCheckItem,
  ImportQaJobSnapshot,
  ImportQaJobStatus,
  KbQa,
} from './api';

export type DrawerType = 'test' | 'duplicate' | null;
export type EditingId = number | 'new' | null;

export type ConfirmAction =
  | { type: 'status'; qa: KbQa; action: 'delete' }
  | { type: 'batch'; qas: KbQa[]; action: 'delete' }
  | { type: 'duplicate-delete'; item: DuplicateCheckItem; groupId: string; action: 'delete' };

export type SortMode = 'default' | 'hit_asc' | 'hit_desc' | 'created_asc' | 'created_desc';

export type ImportProgress = {
  fileName: string;
  status: ImportQaJobStatus | 'uploading';
  percent: number;
  total: number;
  processed: number;
  success: number;
  failed: number;
  message: string;
  errors: ImportQaJobSnapshot['errors'];
} | null;
