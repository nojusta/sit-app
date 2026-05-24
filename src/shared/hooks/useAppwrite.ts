import { useCallback, useEffect, useRef, useState } from "react";

type FetchFunction<T> = (signal?: AbortSignal) => Promise<T>;

interface UseAppwriteResult<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Thin data-fetching helper that keeps UI concerns out:
 * returns error state instead of alerting, and handles aborts.
 */
const useAppwrite = <T>(fn: FetchFunction<T>): UseAppwriteResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const hasLoadedDataRef = useRef(false);

  const fetchData = useCallback(
    async (options?: { refresh?: boolean }) => {
      abortController.current?.abort();
      const controller = new AbortController();
      abortController.current = controller;
      const isRefresh = options?.refresh ?? hasLoadedDataRef.current;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await fn(controller.signal);
        setData(res);
        hasLoadedDataRef.current = true;
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return;
        const normalized = err instanceof Error ? err : new Error("Unknown error");
        if (__DEV__) console.error("Appwrite fetch error:", normalized);
        setError(normalized);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [fn],
  );

  useEffect(() => {
    fetchData();
    return () => abortController.current?.abort();
  }, [fetchData]);

  const refetch = useCallback(() => {
    return fetchData({ refresh: true });
  }, [fetchData]);

  return { data, loading, refreshing, error, refetch };
};

export default useAppwrite;
