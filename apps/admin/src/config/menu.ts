
import {
  Bot,
  Database,
  MessageSquareText,
  Search,
  Settings,
} from 'lucide-react';
import type { AdminRouteKey } from '../router/routes';

export interface MenuItem {
  routeKey: AdminRouteKey;
  path: string;
  label: string;
  icon: typeof Database;
}

export const menuItems: MenuItem[] = [
  { routeKey: 'dashboard', path: '/dashboard', label: '工作台', icon: Database },
  { routeKey: 'agents', path: '/agents', label: '智能体', icon: Bot },
  { routeKey: 'knowledge', path: '/knowledge', label: '知识库', icon: Search },
  { routeKey: 'conversations', path: '/conversations', label: '会话', icon: MessageSquareText },
  { routeKey: 'settings', path: '/settings', label: '系统设置', icon: Settings },
];
