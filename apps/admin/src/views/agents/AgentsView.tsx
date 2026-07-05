import { Button } from '@radix-ui/themes';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { agentPresets } from './mockAgents';
import { AgentProjectList } from './components/AgentProjectList';
import { AgentStudio } from './components/AgentStudio';
import type { AgentPreset } from './types';

function formatUpdatedAt() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function formatFullTime() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function AgentsView() {
  const [agents, setAgents] = useState<AgentPreset[]>(agentPresets);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [hasStudioUnstagedChanges, setHasStudioUnstagedChanges] = useState(false);
  const editingAgent = useMemo(
    () => agents.find((agent) => agent.id === editingAgentId) || null,
    [agents, editingAgentId],
  );

  function handleCreateAgent() {
    const nextAgent: AgentPreset = {
      ...agentPresets[0],
      id: `agent-${Date.now()}`,
      name: '新建智能体',
      description: '请配置智能体名称、提示词、知识库和可用工具。',
      status: 'unpublished',
      hasDraft: true,
      updatedAt: formatUpdatedAt(),
      draftUpdatedAt: formatFullTime(),
      publishedAt: undefined,
    };

    setAgents((current) => [nextAgent, ...current]);
    setEditingAgentId(nextAgent.id);
    setHasStudioUnstagedChanges(false);
  }

  function openAgent(agentId: string) {
    setEditingAgentId(agentId);
    setHasStudioUnstagedChanges(false);
  }

  function closeAgentStudio() {
    if (hasStudioUnstagedChanges && !window.confirm('当前有未暂存修改，离开后不会保留，确定离开吗？')) {
      return;
    }

    setEditingAgentId(null);
    setHasStudioUnstagedChanges(false);
  }

  function handleDeleteAgent(agentId: string) {
    setAgents((current) => current.filter((agent) => agent.id !== agentId));
    if (editingAgentId === agentId) {
      closeAgentStudio();
    }
  }

  function handleToggleAgentFormalStatus(agentId: string) {
    setAgents((current) =>
      current.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              status:
                agent.status === 'published'
                  ? 'disabled'
                  : agent.status === 'disabled'
                    ? 'published'
                    : agent.status,
              updatedAt: formatUpdatedAt(),
            }
          : agent,
      ),
    );
  }

  function handleDuplicateAgent(agentId: string) {
    const source = agents.find((agent) => agent.id === agentId);

    if (!source) {
      return;
    }

    const copiedAgent: AgentPreset = {
      ...source,
      id: `${source.id}-copy-${Date.now()}`,
      name: `${source.name} 副本`,
      status: 'unpublished',
      hasDraft: true,
      updatedAt: formatUpdatedAt(),
      draftUpdatedAt: formatFullTime(),
      publishedAt: undefined,
    };

    setAgents((current) => [copiedAgent, ...current]);
  }

  function handleSaveAgentDraft(agentId: string) {
    const updatedAt = formatUpdatedAt();
    const draftUpdatedAt = formatFullTime();

    setAgents((current) =>
      current.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              hasDraft: true,
              updatedAt,
              draftUpdatedAt,
            }
          : agent,
      ),
    );
  }

  function handlePublishAgent(agentId: string) {
    const updatedAt = formatUpdatedAt();
    const publishedAt = formatFullTime();

    setAgents((current) =>
      current.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              status: 'published',
              hasDraft: false,
              updatedAt,
              draftUpdatedAt: undefined,
              publishedAt,
            }
          : agent,
      ),
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">Agents</div>
          <h1>智能体</h1>
        </div>
        <div className="toolbar">
          <Button highContrast onClick={handleCreateAgent} type="button">
            <Plus size={17} />
            新建智能体
          </Button>
        </div>
      </header>

      <AgentProjectList
        agents={agents}
        onDeleteAgent={handleDeleteAgent}
        onDuplicateAgent={handleDuplicateAgent}
        onOpenAgent={openAgent}
        onToggleAgentFormalStatus={handleToggleAgentFormalStatus}
      />
      {editingAgent && (
        <div className="agent-studio-overlay" role="dialog" aria-modal="true" aria-label="智能体编排">
          <button
            className="agent-studio-scrim"
            onClick={closeAgentStudio}
            type="button"
            aria-label="关闭智能体编排"
          />
          <div className="agent-studio-drawer">
            <AgentStudio
              agent={editingAgent}
              hasUnstagedChanges={hasStudioUnstagedChanges}
              onBack={closeAgentStudio}
              onDirtyChange={setHasStudioUnstagedChanges}
              onPublish={handlePublishAgent}
              onSaveDraft={handleSaveAgentDraft}
            />
          </div>
        </div>
      )}
    </>
  );
}
