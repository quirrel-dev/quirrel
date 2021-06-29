import { useCallback, useState } from "react";

export function useLoading() {
  const [loading, setIsLoading] = useState(false);

  const withLoading = useCallback(
    async (doIt: () => Promise<void>) => {
      setIsLoading(true);
      await doIt();
      setIsLoading(false);
    },
    [setIsLoading]
  );

  return [loading, withLoading] as const;
}
