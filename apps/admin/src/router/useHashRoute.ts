import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultRoute, getRouteByPath } from './routes';

function getCurrentHashPath() {
  const hashPath = window.location.hash.replace(/^#/, '');
  return hashPath || defaultRoute.path;
}

export function useHashRoute() {
  const [path, setPath] = useState(getCurrentHashPath);

  useEffect(() => {
    const handleHashChange = () => setPath(getCurrentHashPath());
    window.addEventListener('hashchange', handleHashChange);

    if (!window.location.hash) {
      window.location.hash = defaultRoute.path;
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const route = useMemo(() => getRouteByPath(path), [path]);

  const navigate = useCallback((nextPath: string) => {
    if (window.location.hash === `#${nextPath}`) {
      setPath(nextPath);
      return;
    }

    window.location.hash = nextPath;
  }, []);

  return { route, navigate };
}
