import { Badge, Button, DropdownMenu, IconButton } from '@radix-ui/themes';
import { Check, Copy, MoreHorizontal, Power, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { AgentPreset } from '../types';
import { getAgentFormalStatusMeta } from '../utils';

interface AgentProjectListProps {
  agents: AgentPreset[];
  onDeleteAgent: (agentId: string) => void;
  onDuplicateAgent: (agentId: string) => void;
  onOpenAgent: (agentId: string) => void;
  onToggleAgentFormalStatus: (agentId: string) => void;
}

export function AgentProjectList({
  agents,
  onDeleteAgent,
  onDuplicateAgent,
  onOpenAgent,
  onToggleAgentFormalStatus,
}: AgentProjectListProps) {
  const [copiedAgentId, setCopiedAgentId] = useState<string | null>(null);

  async function copyAgentId(agentId: string) {
    await navigator.clipboard?.writeText(agentId);
    setCopiedAgentId(agentId);
    window.setTimeout(() => setCopiedAgentId((current) => (current === agentId ? null : current)), 1200);
  }

  return (
    <section className="agent-project-panel">
      <div className="agent-project-head">
        <div>
          <h2>智能体项目</h2>
          <p>{agents.length} 个智能体 · 点击卡片进入编排工作台</p>
        </div>
      </div>

      <div className="agent-project-list">
        {agents.map((agent) => {
          const formalMeta = getAgentFormalStatusMeta(agent);

          return (
            <article className="agent-project-card" key={agent.id}>
              <div className="agent-project-card-header">
                <span className="agent-project-id">
                  <span>{agent.id}</span>
                  <Button
                    className="agent-project-copy-id"
                    aria-label={`复制${agent.name}智能体 ID`}
                    color="gray"
                    highContrast
                    size="1"
                    variant="ghost"
                    onClick={() => void copyAgentId(agent.id)}
                    type="button"
                  >
                    {copiedAgentId === agent.id ? <Check size={13} /> : <Copy size={13} />}
                  </Button>
                </span>
                <span className="agent-project-state">
                  {agent.hasDraft && <Badge color="blue" variant="soft">待发布</Badge>}
                  <Badge color={formalMeta.color} variant="soft">
                    {formalMeta.label}
                  </Badge>
                </span>
              </div>
              <button
                aria-label={`进入${agent.name}编排工作台`}
                className="agent-project-card-main"
                onClick={() => onOpenAgent(agent.id)}
                type="button"
              >
                <span className="agent-avatar">{agent.name.slice(0, 1)}</span>
                <span className="agent-project-copy">
                  <strong>{agent.name}</strong>
                  <span>{agent.description}</span>
                </span>
              </button>
              <div className="agent-project-footer">
                <span>{agent.updatedAt}</span>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <IconButton
                      className="agent-project-more"
                      color="gray"
                      highContrast
                      size="1"
                      variant="ghost"
                      aria-label={`${agent.name}更多操作`}
                    >
                      <MoreHorizontal size={15} />
                    </IconButton>
                  </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                    <DropdownMenu.Item
                      disabled={agent.status === 'unpublished'}
                      onSelect={() => onToggleAgentFormalStatus(agent.id)}
                    >
                      <Power size={14} />
                      {agent.status === 'published'
                        ? '停用'
                        : agent.status === 'disabled'
                          ? '启用'
                          : '未发布不可启用'}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => onDuplicateAgent(agent.id)}>
                      <Copy size={14} />
                      创建副本
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item color="red" onSelect={() => onDeleteAgent(agent.id)}>
                      <Trash2 size={14} />
                      删除
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
