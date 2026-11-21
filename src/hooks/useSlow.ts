import { useEffect, useState } from "react";

/**
 * true once `active` has lasted longer than `ms`. Used for "the server is waking up":
 * the free Render plan sleeps after 15 minutes idle and the first request can take ~1 minute.
 */
export function useSlow(active: boolean, ms = 6000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setSlow(true), ms);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [active, ms]);
  return active && slow;
}
