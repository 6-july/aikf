
import { IconButton } from '@radix-ui/themes';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { TooltipLabel } from '../components/common/TooltipLabel';
import { menuItems } from '../config/menu';
import type { AdminRouteKey } from '../router/routes';

interface AdminLayoutProps {
  children: ReactNode;
  activeRouteKey: AdminRouteKey;
  sidebarCollapsed: boolean;
  onNavigate: (path: string) => void;
  onToggleSidebar: () => void;
}

export function AdminLayout({
  children,
  activeRouteKey,
  sidebarCollapsed,
  onNavigate,
  onToggleSidebar,
}: AdminLayoutProps) {
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">U</div>
          <div className="brand-copy">
            <div className="brand-title">AI 客服</div>
            <div className="brand-subtitle">UU 跑男</div>
          </div>
          <span className="sidebar-toggle-slot">
            <TooltipLabel content={sidebarCollapsed ? '展开菜单' : '折叠菜单'}>
              <IconButton
                aria-label={sidebarCollapsed ? '展开菜单' : '折叠菜单'}
                color="gray"
                onClick={onToggleSidebar}
                size="2"
                type="button"
                variant="outline"
              >
                {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              </IconButton>
            </TooltipLabel>
          </span>
        </div>
        <nav className="menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = item.routeKey === activeRouteKey;

            return (
              <button
                className={`menu-item ${active ? 'active' : ''}`}
                key={item.routeKey}
                onClick={() => onNavigate(item.path)}
                type="button"
                title={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
