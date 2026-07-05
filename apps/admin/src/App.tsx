
import * as Toast from '@radix-ui/react-toast';
import { Theme } from '@radix-ui/themes';
import { AdminLayout } from './layouts/AdminLayout';
import { AppRouter } from './router/AppRouter';
import { useHashRoute } from './router/useHashRoute';
import { useAdminUiStore } from './store/adminUiStore';

export function App() {
  const { sidebarCollapsed, toggleSidebar } = useAdminUiStore();
  const { route, navigate } = useHashRoute();

  return (
    <Theme accentColor="gray" grayColor="slate" panelBackground="solid">
      <Toast.Provider swipeDirection="up">
        <AdminLayout
          activeRouteKey={route.key}
          sidebarCollapsed={sidebarCollapsed}
          onNavigate={navigate}
          onToggleSidebar={toggleSidebar}
        >
          <AppRouter route={route} />
        </AdminLayout>
        <Toast.Viewport className="toast-viewport" />
      </Toast.Provider>
    </Theme>
  );
}
