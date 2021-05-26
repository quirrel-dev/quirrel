import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { GlobalSearchProvider } from "../hooks/useGlobalSearch";
import { QuirrelProvider } from "../hooks/useQuirrel";
import { BaseLayout } from "../layouts/BaseLayout";
import Activity from "../pages/activity";
import Cron from "../pages/cron";
import Pending from "../pages/pending";

export type Route = "cron" | "activity" | "pending";

interface QuirrelDevelopmentUIProps {
  router: {
    initial: Route;
    onChange(route: Route): void;
    listenToNavigationChanges(onChange: (newRoute: Route) => void): () => void;
  };
}

const pageMap: Record<Route, React.FunctionComponent> = {
  activity: Activity,
  cron: Cron,
  pending: Pending,
};

interface Router {
  current: Route;
  navigate(route: Route): void;
}

export const RouterContext = createContext<Router>({
  current: "activity",
  navigate() {},
});

export function QuirrelDevelopmentUI(props: QuirrelDevelopmentUIProps) {
  const { initial, onChange, listenToNavigationChanges } = props.router;
  const [route, setRoute] = useState(initial);
  const navigate = useCallback(
    (newRoute: Route) => {
      setRoute(newRoute);
      onChange(newRoute);
    },
    [setRoute, onChange]
  );

  const router = useMemo<Router>(
    () => ({ current: route, navigate }),
    [route, navigate]
  );

  useEffect(() => {
    return listenToNavigationChanges(setRoute);
  }, [listenToNavigationChanges, setRoute]);

  let Page = pageMap[route];

  return (
    <RouterContext.Provider value={router}>
      <GlobalSearchProvider>
        <QuirrelProvider>
          <BaseLayout>
            <Page />
          </BaseLayout>
        </QuirrelProvider>
      </GlobalSearchProvider>
    </RouterContext.Provider>
  );
}
