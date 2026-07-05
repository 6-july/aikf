import type { AdminRoute } from './routes';

interface AppRouterProps {
  route: AdminRoute;
}

export function AppRouter({ route }: AppRouterProps) {
  const Page = route.component;
  return <Page />;
}
