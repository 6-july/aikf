import { Button, TextArea, TextField } from '@radix-ui/themes';
import { AlertTriangle, Check, Plus, Sparkles, X } from 'lucide-react';
import { Field } from '../../../components/common/Field';
import { SelectField } from '../../../components/common/SelectField';
import type { KbQa } from '../../../types/api';
import { audienceOptions } from '../../../constants/knowledgeBase';
import type { useKnowledgeBase } from '../../../hooks/useKnowledgeBase';

type KnowledgeBaseState = ReturnType<typeof useKnowledgeBase>;

interface QaInlineEditorProps {
  kb: KnowledgeBaseState;
  qa?: KbQa;
}

export function QaInlineEditor({ kb, qa }: QaInlineEditorProps) {
  const isNew = !qa;

  return (
    <div className={`qa-inline-editor ${isNew ? 'new' : ''}`} key={qa?.id || 'new'}>
      {isNew && (
        <div className="inline-editor-bar">
          <div>
            <h3>新增 QA</h3>
            <p>填写完成后可直接发布</p>
          </div>
          <div className="row-actions">
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
          </div>
        </div>
      )}

      <div className="inline-edit-fields">
        <div className="publish-warning">
          <AlertTriangle size={14} />
          <span>发布后会立即生成或更新索引，并参与知识库召回，请确认内容无误。</span>
        </div>
        <div className="inline-form-grid">
          <Field label="标准问题">
            <TextField.Root
              value={kb.form.standardQuestion}
              onChange={(event) => kb.updateField('standardQuestion', event.target.value)}
              placeholder="注册跑男流程"
            />
          </Field>
          <Field label="分类路径">
            <TextField.Root
              value={kb.form.categoryPath}
              onChange={(event) => kb.updateField('categoryPath', event.target.value)}
              placeholder="跑男注册/注册流程"
            />
          </Field>
          <Field label="适用对象">
            <SelectField
              ariaLabel="适用对象"
              options={audienceOptions}
              value={kb.form.audience}
              onValueChange={(value) => kb.updateField('audience', value)}
            />
          </Field>
        </div>

        <Field label="相似问法">
          <div className="similar-question-control">
            <TextArea
              value={kb.form.similarQuestions}
              onChange={(event) => kb.updateField('similarQuestions', event.target.value)}
              placeholder="如何加入跑男;怎么跑单，也支持换行粘贴"
              rows={2}
            />
            <div className="similar-question-tools">
              <Button
                color="gray"
                size="1"
                variant="ghost"
                disabled={!kb.selectedQa}
                onClick={() => void kb.runGenerateSimilar()}
                type="button"
                title="生成相似问法"
              >
                <Sparkles size={15} />
                生成相似问法
              </Button>
            </div>
            {kb.similarCandidates.length > 0 && (
              <div className="similar-candidate-actions">
                {kb.similarCandidates.map((candidate) => (
                  <Button
                    color="gray"
                    size="1"
                    variant="soft"
                    key={candidate}
                    onClick={() => kb.appendSimilarQuestion(candidate)}
                    type="button"
                    title="追加到相似问法"
                  >
                    <Plus size={14} />
                    {candidate}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </Field>

        <Field label="标准答案">
          <TextArea
            value={kb.form.answer}
            onChange={(event) => kb.updateField('answer', event.target.value)}
            rows={3}
          />
        </Field>

        <Field label="解答思路">
          <TextArea
            value={kb.form.solutionIdea}
            onChange={(event) => kb.updateField('solutionIdea', event.target.value)}
            rows={2}
          />
        </Field>
      </div>
    </div>
  );
}
