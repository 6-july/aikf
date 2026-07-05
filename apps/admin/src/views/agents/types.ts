import type { LucideIcon } from 'lucide-react';

export interface AgentTool {
  name: string;
  description: string;
  enabled: boolean;
  icon: LucideIcon;
}

export interface AgentDebugStep {
  label: string;
  value: string;
}

export type AgentFormalStatus = 'unpublished' | 'published' | 'disabled';

export interface AgentPreset {
  id: string;
  name: string;
  description: string;
  status: AgentFormalStatus;
  hasDraft: boolean;
  audience: string;
  model: string;
  updatedAt: string;
  draftUpdatedAt?: string;
  publishedAt?: string;
  systemPrompt: string;
  openingMessage: string;
  fallbackMessage: string;
  tools: AgentTool[];
  debugSteps: AgentDebugStep[];
}
