import { Button, Checkbox, Slider, TextArea, TextField } from '@radix-ui/themes';
import { Search } from 'lucide-react';
import { Field } from '../../../components/common/Field';
import { SelectField } from '../../../components/common/SelectField';
import { audienceOptions, maxRecallOptions } from '../../../constants/knowledgeBase';
import type { useKnowledgeBase } from '../../../hooks/useKnowledgeBase';
import { indexTypeLabel } from '../../../utils/knowledgeBase';

type KnowledgeBaseState = ReturnType<typeof useKnowledgeBase>;

interface RecallTestDrawerProps {
  kb: KnowledgeBaseState;
}

export function RecallTestDrawer({ kb }: RecallTestDrawerProps) {
  return (
    <>
      <Field className="test-query-field" label="测试问题">
        <TextArea
          value={kb.testQuery}
          onChange={(event) => kb.setTestQuery(event.target.value)}
          rows={2}
        />
      </Field>
      <div className="test-grid">
        <Field label="测试对象">
          <div className="check-chip-group">
            {audienceOptions.map((option) => {
              const checked = kb.testAudiences.includes(option.value);

              return (
                <label className="check-chip" key={option.value}>
                  <Checkbox
                    aria-label={`测试对象：${option.label}`}
                    checked={checked}
                    highContrast
                    onCheckedChange={() => kb.toggleTestAudience(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </Field>
        <Field label="最大召回数">
          <SelectField
            ariaLabel="最大召回数"
            options={maxRecallOptions.map((option) => ({
              value: String(option),
              label: `${option} 条`,
            }))}
            value={String(kb.finalTopK)}
            onValueChange={(value) => kb.setFinalTopK(Number(value))}
          />
        </Field>
      </div>
      <div className="score-control">
        <div className="score-control-head">
          <span>最低匹配度</span>
          <TextField.Root
            aria-label="最低匹配度"
            className="score-input"
            inputMode="decimal"
            onBlur={kb.commitMinScoreInput}
            onChange={(event) => kb.updateMinScoreInput(event.target.value)}
            placeholder="0.50"
            type="text"
            value={kb.minScoreInput}
          />
        </div>
        <Slider
          aria-label="最低匹配度"
          highContrast
          max={1}
          min={0}
          onValueChange={([value]) => kb.updateMinScore(value)}
          step={0.01}
          value={[kb.minScore]}
        />
      </div>
      <div className="drawer-actions">
        <Button className="full" highContrast disabled={kb.searching} onClick={() => void kb.runTestSearch()} type="button">
          <Search size={17} />
          {kb.searching ? '测试中' : '开始测试'}
        </Button>
      </div>
      <p className="result-note">
        （注：召回测试仅代表知识库匹配情况，最终回复会由 AI 结合上下文再次判断是否采纳。）
      </p>

      {kb.searchResult && (
        <div className="result-list">
          <div className="result-summary">
            <div className="result-summary-title">
              <span className="result-summary-label">召回结果</span>
            </div>
            <strong>
              {kb.searchResult.matches.length}/{kb.finalTopK}
            </strong>
          </div>
          {kb.searchResult.matches.length > 0 ? (
            kb.searchResult.matches.map((match, index) => (
              <div className="result-box" key={`${match.qaId}-${match.indexType}-${index}`}>
                <div className="result-score">
                  <span>{index === 0 ? '最佳命中' : `召回 ${index + 1}`}</span>
                  <strong>{match.score.toFixed(4)}</strong>
                </div>
                <h3>{match.standardQuestion}</h3>
                <p>{match.answer}</p>
                <div className="result-hit-source">
                  <span>命中来源：{indexTypeLabel(match.indexType)}</span>
                  <span>命中文本：{match.matchedIndexText}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="result-empty">没有达到最低匹配度的召回结果</div>
          )}
        </div>
      )}
    </>
  );
}
