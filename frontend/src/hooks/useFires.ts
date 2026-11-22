import { useEffect, useState } from "react";
import { ApiError, fetchFires } from "@/lib/api";
import type { FiresData } from "@/types";

/** Loads FIRMS data the first time the layer is switched on, then keeps it. */
export function useFires(enabled: boolean) {
  const [data, setData] = useState<FiresData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || data || error) return;
    let cancelled = false;
    fetchFires()
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err instanceof ApiError && err.code ? err.code : "firms_unavailable"));
    return () => {
      cancelled = true;
    };
  }, [enabled, data, error, attempt]);

  return {
    data,
    error,
    // Loading = switched on, nothing yet, no error.
    loading: enabled && !data && !error,
    retry: () => {
      setError(null);
      setAttempt((n) => n + 1);
    },
  };
}
