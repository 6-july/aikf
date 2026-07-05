export const BUSINESS_DOMAINS = [
  'runner_service',
  'user_service',
  'merchant_service',
] as const;

export const AUDIENCES = ['common', 'runner', 'user', 'merchant', 'customer_service'] as const;

export const QA_STATUSES = ['published', 'offline', 'deleted'] as const;

export const QA_INDEX_STATUSES = ['active', 'inactive'] as const;

export const QA_INDEX_TYPES = [
  'standard_question',
  'manual_alias',
  'category_question',
  'answer_summary',
] as const;

