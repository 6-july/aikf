import { useState } from 'react';

export function useAdminUiStore() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return {
    sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((current) => !current),
  };
}
