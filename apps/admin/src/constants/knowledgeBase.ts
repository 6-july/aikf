import type { QaForm } from '../types/api';
import type { DuplicateCheckType } from '../types/api';
import type { SelectOption } from '../components/common/types';

export const emptyForm: QaForm = {
  businessDomain: '',
  audience: 'runner',
  categoryPath: '',
  standardQuestion: '',
  similarQuestions: '',
  answer: '',
  solutionIdea: '',
};

export const audienceOptions: SelectOption[] = [
  { value: 'common', label: '通用' },
  { value: 'runner', label: '跑男' },
  { value: 'user', label: '用户' },
];

export const sortOptions: SelectOption[] = [
  { value: 'default', label: '默认排序' },
  { value: 'created_desc', label: '创建时间降序' },
  { value: 'created_asc', label: '创建时间升序' },
  { value: 'hit_desc', label: '命中数降序' },
  { value: 'hit_asc', label: '命中数升序' },
];

export const QA_LIST_PAGE_SIZE = 50;
export const QA_LIST_MAX_VISIBLE = 500;
export const maxRecallOptions = [1, 3, 5, 10, 20];
export const duplicateThresholdOptions = [0.8, 0.86, 0.9, 0.95];
export const duplicateAudienceOptions: SelectOption[] = [
  { value: 'all', label: '全部对象' },
  ...audienceOptions,
];
export const duplicateTypeOrder: DuplicateCheckType[] = [
  'standard_question',
  'similar_question_cross',
  'semantic_similarity',
];
