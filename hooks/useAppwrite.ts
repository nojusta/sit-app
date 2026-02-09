import { useCallback, useEffect, useRef, useState } from "react";

type FetchFunction<T> = (signal?: AbortSignal) => Promise<T>;

interface UseAppwriteResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Thin data-fetching helper that keeps UI concerns out:
 * returns error state instead of alerting, and handles aborts.
 */
const useAppwrite = <T>(fn: FetchFunction<T>): UseAppwriteResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fn(controller.signal);
      setData(res);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const normalized = err instanceof Error ? err : new Error("Unknown error");
      if (__DEV__) console.error("Appwrite fetch error:", normalized);
      setError(normalized);
    } finally {
      setLoading(false);
    }
  }, [fn]);

  useEffect(() => {
    fetchData();
    return () => abortController.current?.abort();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export default useAppwrite;
