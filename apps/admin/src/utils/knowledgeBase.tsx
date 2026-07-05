import type { ReactNode } from 'react';
import type {
  DuplicateCheckGroup,
  DuplicateCheckItem,
  DuplicateCheckType,
  KbQa,
  QaForm,
} from '../types/api';
import { audienceOptions } from '../constants/knowledgeBase';

export function toForm(qa: KbQa): QaForm {
  return {
    businessDomain: qa.businessDomain,
    audience: qa.audience,
    categoryPath: qa.categoryPath || '',
    standardQuestion: qa.standardQuestion,
    similarQuestions: qa.similarQuestions || '',
    answer: qa.answer,
    solutionIdea: qa.solutionIdea || '',
  };
}

export function parseSimilarQuestions(value?: string) {
  return (value || '')
    .replace(/([?？])\s*/g, '$1\n')
    .split(/[;；\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function audienceLabel(value?: string) {
  return audienceOptions.find((option) => option.value === value)?.label || value || '未设置';
}

export function indexTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    standard_question: '标准问题',
    manual_alias: '相似问法',
    category_question: '分类组合',
    answer_summary: '答案摘要',
  };

  return labels[value || ''] || value || '未知索引';
}

export function duplicateTypeLabel(value: DuplicateCheckType) {
  const labels: Record<DuplicateCheckType, string> = {
    standard_question: '标准问题重复',
    similar_question_cross: '相似问法交叉重复',
    semantic_similarity: '语义相似',
  };

  return labels[value];
}

export function duplicateHighlightText(
  group: DuplicateCheckGroup,
  item: DuplicateCheckItem,
  field: 'standardQuestion' | 'similarQuestions',
) {
  if (group.type === 'standard_question') {
    return field === 'standardQuestion' ? group.matchedText : undefined;
  }

  if (group.type === 'similar_question_cross') {
    return field === 'similarQuestions' ? group.matchedText : undefined;
  }

  if (item.matchedIndexType === 'standard_question') {
    return field === 'standardQuestion' ? item.matchedText : undefined;
  }

  if (item.matchedIndexType === 'manual_alias') {
    return field === 'similarQuestions' ? item.matchedText : undefined;
  }

  return undefined;
}

export function highlightDuplicateText(text: string, highlight?: string): ReactNode {
  if (!highlight) {
    return text;
  }

  const normalizedHighlight = highlight.trim();

  if (!normalizedHighlight) {
    return text;
  }

  const index = text.toLowerCase().indexOf(normalizedHighlight.toLowerCase());

  if (index < 0) {
    return text;
  }

  return (
    <>
      {text.slice(0, index)}
      <mark className="duplicate-highlight">
        {text.slice(index, index + normalizedHighlight.length)}
      </mark>
      {text.slice(index + normalizedHighlight.length)}
    </>
  );
}
