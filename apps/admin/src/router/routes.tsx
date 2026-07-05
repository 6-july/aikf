import type { ComponentType } from 'react';
import { AgentsView } from '../views/agents/AgentsView';
import { ConversationsView } from '../views/conversations/ConversationsView';
import { DashboardView } from '../views/dashboard/DashboardView';
import { KnowledgeView } from '../views/knowledge/KnowledgeView';
import { SettingsView } from '../views/settings/SettingsView';

export type AdminRouteKey = 'dashboard' | 'agents' | 'knowledge' | 'conversations' | 'settings';

export interface AdminRoute {
  key: AdminRouteKey;
  path: string;
  label: string;
  component: ComponentType;
}

export const defaultRouteKey: AdminRouteKey = 'knowledge';

export const adminRoutes: AdminRoute[] = [
  { key: 'dashboard', path: '/dashboard', label: '工作台', component: DashboardView },
  { key: 'agents', path: '/agents', label: '智能体', component: AgentsView },
  { key: 'knowledge', path: '/knowledge', label: '知识库', component: KnowledgeView },
  { key: 'conversations', path: '/conversations', label: '会话', component: ConversationsView },
  { key: 'settings', path: '/settings', label: '系统设置', component: SettingsView },
];

export const defaultRoute = adminRoutes.find((route) => route.key === defaultRouteKey)!;

export function getRouteByPath(path: string) {
  return adminRoutes.find((route) => route.path === path) || defaultRoute;
}
