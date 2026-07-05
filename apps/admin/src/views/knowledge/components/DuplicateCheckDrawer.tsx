import { Button } from '@radix-ui/themes';
import { Search, Trash2 } from 'lucide-react';
import { Field } from '../../../components/common/Field';
import { SelectField } from '../../../components/common/SelectField';
import type { DuplicateCheckGroup } from '../../../types/api';
import {
  duplicateAudienceOptions,
  duplicateThresholdOptions,
  duplicateTypeOrder,
} from '../../../constants/knowledgeBase';
import type { useKnowledgeBase } from '../../../hooks/useKnowledgeBase';
import {
  audienceLabel,
  duplicateHighlightText,
  duplicateTypeLabel,
  highlightDuplicateText,
} from '../../../utils/knowledgeBase';

type KnowledgeBaseState = ReturnType<typeof useKnowledgeBase>;

interface DuplicateCheckDrawerProps {
  kb: KnowledgeBaseState;
}

export function DuplicateCheckDrawer({ kb }: DuplicateCheckDrawerProps) {
  return (
    <>
      <div className="duplicate-intro">
        本次检测包含标准问题重复、相似问法交叉重复、语义相似。语义相似仅使用已有向量索引，不调用模型。
      </div>
      <div className="test-grid">
        <Field label="检测对象">
          <SelectField
            ariaLabel="检测对象"
            options={duplicateAudienceOptions}
            value={kb.duplicateAudience}
            onValueChange={kb.setDuplicateAudience}
          />
        </Field>
        <Field label="语义阈值">
          <SelectField
            ariaLabel="语义阈值"
            options={duplicateThresholdOptions.map((option) => ({
              value: String(option),
              label: option.toFixed(2),
            }))}
            value={String(kb.duplicateMinScore)}
            onValueChange={(value) => kb.setDuplicateMinScore(Number(value))}
          />
        </Field>
      </div>
      <div className="drawer-actions">
        <Button
          className="full"
          highContrast
          disabled={kb.checkingDuplicates}
          onClick={() => void kb.runDuplicateCheck()}
          type="button"
        >
          <Search size={17} />
          {kb.checkingDuplicates ? '检测中' : '开始检测'}
        </Button>
      </div>

      {kb.duplicateResult && (
        <div className="result-list">
          <div className="result-summary">
            <div className="result-summary-title">
              <span className="result-summary-label">检测结果</span>
            </div>
            <strong>{kb.duplicateResult.groups.length} 组</strong>
          </div>
          {kb.duplicateResult.groups.length > 0 ? (
            <div className="duplicate-sections">
              {duplicateTypeOrder.map((type) => {
                const groups = kb.duplicateResult!.groups.filter((group) => group.type === type);

                return (
                  <details className="duplicate-section" key={type} open={groups.length > 0}>
                    <summary>
                      <span>{duplicateTypeLabel(type)}</span>
                      <strong>{groups.length} 组</strong>
                    </summary>
                    {groups.length > 0 ? (
                      <div className="duplicate-section-body">
                        {groups.map((group) => <DuplicateGroup key={group.id} group={group} kb={kb} />)}
                      </div>
                    ) : (
                      <div className="result-empty compact">暂无结果</div>
                    )}
                  </details>
                );
              })}
            </div>
          ) : (
            <div className="result-empty">未发现疑似重复 QA</div>
          )}
        </div>
      )}
    </>
  );
}

interface DuplicateGroupProps {
  group: DuplicateCheckGroup;
  kb: KnowledgeBaseState;
}

function DuplicateGroup({ group, kb }: DuplicateGroupProps) {
  return (
    <div className="result-box duplicate-box">
      {group.score !== undefined && (
        <div className="result-score duplicate-score">
          <span>相似度</span>
          <strong>{group.score.toFixed(4)}</strong>
        </div>
      )}
      <div className="duplicate-items">
        {group.items.map((item) => (
          <div className="duplicate-item" key={`${group.id}-${item.qaId}`}>
            <div className="duplicate-item-title">
              <div>
                <strong>{item.code}</strong>
                <span>{highlightDuplicateText(item.standardQuestion, duplicateHighlightText(group, item, 'standardQuestion'))}</span>
              </div>
              {group.type === 'standard_question' && (
                <Button
                  className="duplicate-delete-button"
                  color="red"
                  size="1"
                  variant="ghost"
                  onClick={() => kb.requestDuplicateDeleteConfirm(group, item)}
                  type="button"
                  title="删除这条 QA"
                >
                  <Trash2 size={14} />
                  删除
                </Button>
              )}
            </div>
            <div className="duplicate-item-row">
              <span className="duplicate-item-label">分类</span>
              <span>{item.categoryPath || '未分类'} · {audienceLabel(item.audience)}</span>
            </div>
            <div className="duplicate-item-row">
              <span className="duplicate-item-label">相似问法</span>
              <span>{highlightDuplicateText(item.similarQuestions || '无', duplicateHighlightText(group, item, 'similarQuestions'))}</span>
            </div>
            <div className="duplicate-item-row">
              <span className="duplicate-item-label">答案</span>
              <span>{item.answer}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
