// Tiny in-memory TTL cache with in-flight de-duplication: while one request
// is fetching, others for the same key wait for it instead of calling the API again.
// Lives in process memory: a server restart (or Render sleep) starts it empty.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export function createCache<T>(ttlMs: number) {
  const store = new Map<string, Entry<T>>();
  const pending = new Map<string, Promise<T>>();

  return {
    async get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = store.get(key);
      if (hit && hit.expiresAt > Date.now()) return hit.value;
      const inflight = pending.get(key);
      if (inflight) return inflight;
      const p = load()
        .then((value) => {
          store.set(key, { value, expiresAt: Date.now() + ttlMs });
          return value;
        })
        .finally(() => pending.delete(key));
      pending.set(key, p);
      return p;
    },
    /** Last value even if expired (to serve stale data when the upstream API is down). */
    stale(key: string): T | undefined {
      return store.get(key)?.value;
    },
  };
}
