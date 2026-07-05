import { Badge, Button } from '@radix-ui/themes';
import { Archive, ArrowLeft, Sparkles } from 'lucide-react';
import type { AgentPreset } from '../types';
import { getAgentDraftMeta, getAgentFormalStatusMeta } from '../utils';
import { AgentConfigColumn } from './AgentConfigColumn';
import { AgentPromptColumn } from './AgentPromptColumn';
import { AgentPreviewColumn } from './AgentPreviewColumn';

interface AgentStudioProps {
  agent: AgentPreset;
  hasUnstagedChanges: boolean;
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onPublish: (agentId: string) => void;
  onSaveDraft: (agentId: string) => void;
}

export function AgentStudio({
  agent,
  hasUnstagedChanges,
  onBack,
  onDirtyChange,
  onPublish,
  onSaveDraft,
}: AgentStudioProps) {
  const formalState = getAgentFormalStatusMeta(agent);
  const draftState = getAgentDraftMeta(agent, hasUnstagedChanges);
  const canStage = hasUnstagedChanges;
  const canPublish = agent.hasDraft && !hasUnstagedChanges;

  function markDraftChanged() {
    onDirtyChange(true);
  }

  function saveDraft() {
    onSaveDraft(agent.id);
    onDirtyChange(false);
  }

  function publishDraft() {
    onPublish(agent.id);
    onDirtyChange(false);
  }

  return (
    <div className="agent-studio">
      <header className="agent-studio-topbar">
        <div className="agent-studio-titlebar">
          <Button color="gray" highContrast variant="ghost" onClick={onBack} type="button" aria-label="返回列表">
            <ArrowLeft size={18} />
          </Button>
          <span className="agent-studio-avatar">{agent.name.slice(0, 1)}</span>
          <div>
            <div className="agent-studio-name-row">
              <h1>{agent.name}-线侧</h1>
              <Badge color={formalState.color} variant="soft">
                {formalState.label}
              </Badge>
            </div>
          </div>
        </div>
        <div className="agent-studio-actions">
          <span className="agent-save-state">
            <Badge color={draftState.color} variant="soft">{draftState.label}</Badge>
            <span>{draftState.text}</span>
          </span>
          <Button color="gray" highContrast variant="outline" disabled={!canStage} onClick={saveDraft} type="button">
            <Archive size={16} />
            暂存
          </Button>
          <Button
            highContrast
            disabled={!canPublish}
            onClick={publishDraft}
            title={hasUnstagedChanges ? '请先暂存当前修改' : !agent.hasDraft ? '暂无待发布草稿' : '发布已暂存草稿'}
            type="button"
          >
            <Sparkles size={16} />
            发布
          </Button>
        </div>
      </header>

      <section className="agent-studio-grid">
        <AgentPromptColumn agent={agent} onDraftChange={markDraftChanged} />
        <AgentConfigColumn agent={agent} onDraftChange={markDraftChanged} />
        <AgentPreviewColumn agent={agent} />
      </section>
    </div>
  );
}
