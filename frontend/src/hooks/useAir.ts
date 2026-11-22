import { useCallback, useEffect, useState } from "react";
import { fetchAir } from "@/lib/api";
import type { AirData } from "@/types";

const REFRESH_MS = 15 * 60_000;

/** Air data for Atyrau, refreshed every 15 minutes (matches the server cache). */
export function useAir() {
  const [data, setData] = useState<AirData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchAir());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { data, loading, error, reload: load };
}
