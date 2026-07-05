import type { AgentPreset } from './types';

export function getAgentFormalStatusMeta(agent: AgentPreset) {
  if (agent.status === 'unpublished') {
    return {
      color: 'gray' as const,
      label: '未发布',
    };
  }

  if (agent.status === 'disabled') {
    return {
      color: 'gray' as const,
      label: '已停用',
    };
  }

  return {
    color: 'green' as const,
    label: '已发布',
  };
}

export function getAgentDraftMeta(agent: AgentPreset, hasUnstagedChanges: boolean) {
  if (hasUnstagedChanges) {
    return {
      color: 'orange' as const,
      label: '未暂存',
      text: '有未暂存修改，暂存后才可发布',
    };
  }

  if (agent.hasDraft) {
    return {
      color: 'blue' as const,
      label: '待发布',
      text: agent.draftUpdatedAt ? `草稿已暂存 ${agent.draftUpdatedAt}` : '草稿已暂存，等待发布',
    };
  }

  const formalMeta = getAgentFormalStatusMeta(agent);
  const text =
    agent.status === 'published' && agent.publishedAt
      ? `线上版本 ${agent.publishedAt}`
      : formalMeta.label;

  return { ...formalMeta, text };
}
