import { Button } from '@radix-ui/themes';
import { Check, SquarePen, Trash2, X } from 'lucide-react';
import { CheckboxControl } from '../../../components/common/CheckboxControl';
import { SignalPopover } from '../../../components/common/SignalPopover';
import type { KbQa } from '../../../types/api';
import type { useKnowledgeBase } from '../../../hooks/useKnowledgeBase';
import { audienceLabel, parseSimilarQuestions } from '../../../utils/knowledgeBase';
import { QaInlineEditor } from './QaInlineEditor';

type KnowledgeBaseState = ReturnType<typeof useKnowledgeBase>;

interface QaRowProps {
  qa: KbQa;
  kb: KnowledgeBaseState;
}

export function QaRow({ qa, kb }: QaRowProps) {
  const isEditing = kb.editingId === qa.id;
  const similarQuestions = parseSimilarQuestions(qa.similarQuestions);
  const similarCount = similarQuestions.length;
  const hasSolutionIdea = Boolean(qa.solutionIdea?.trim());

  return (
    <div className={`qa-row-block ${isEditing ? 'editing' : ''}`}>
      <div className="qa-row">
        <span className="row-select">
          <CheckboxControl
            ariaLabel="选择 QA"
            checked={kb.selectedQaIds.includes(qa.id)}
            disabled={isEditing}
            onCheckedChange={() => kb.toggleSelectedQa(qa.id)}
          />
        </span>
        <span className="qa-row-content">
          <span className="qa-row-title-line">
            <strong title={qa.standardQuestion}>{qa.standardQuestion}</strong>
            <span
              className="qa-row-meta"
              title={`${qa.categoryPath || '未分类'} · ${audienceLabel(qa.audience)} · ${qa.code}`}
            >
              {qa.categoryPath || '未分类'} · {audienceLabel(qa.audience)} · {qa.code}
            </span>
          </span>
          <span className="qa-answer-preview">{qa.answer}</span>
          {(similarCount > 0 || hasSolutionIdea) && (
            <span className="qa-row-signals">
              {similarCount > 0 && (
                <SignalPopover
                  items={similarQuestions}
                  label={`相似问题 ${similarCount}`}
                  title="相似问题"
                />
              )}
              {hasSolutionIdea && (
                <SignalPopover label="解答思路" text={qa.solutionIdea} title="解答思路" />
              )}
            </span>
          )}
        </span>
        <span className="hit-count">命中 {qa.hitCount} 次</span>
        <div className="row-actions">
          {isEditing ? (
            <>
              <Button
                highContrast
                size="1"
                disabled={kb.saving}
                onClick={kb.publishForm}
                type="button"
              >
                <Check size={15} />
                {kb.saving ? '发布中' : '发布'}
              </Button>
              <Button color="gray" highContrast size="1" variant="outline" onClick={kb.cancelEdit} type="button">
                <X size={15} />
                取消
              </Button>
            </>
          ) : (
            <>
              <Button
                highContrast
                size="1"
                variant="ghost"
                onClick={() => kb.startEdit(qa)}
                type="button"
                title="编辑 QA"
              >
                <SquarePen size={15} />
                编辑
              </Button>
              <Button
                color="red"
                size="1"
                variant="ghost"
                onClick={() => kb.requestDeleteConfirm(qa)}
                type="button"
                title="删除 QA"
              >
                <Trash2 size={15} />
                删除
              </Button>
            </>
          )}
        </div>
      </div>
      {isEditing && <QaInlineEditor qa={qa} kb={kb} />}
    </div>
  );
}
