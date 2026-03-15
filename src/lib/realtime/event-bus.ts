// In-memory pub/sub for SSE push (singleton per Node.js process)

type Listener = (event: string, data: unknown) => void;

const channels = new Map<string, Set<Listener>>();

export function subscribe(spaceId: string, listener: Listener): () => void {
  if (!channels.has(spaceId)) {
    channels.set(spaceId, new Set());
  }
  const listeners = channels.get(spaceId)!;
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      channels.delete(spaceId);
    }
  };
}

export function publish(spaceId: string, event: string, data: unknown): void {
  const listeners = channels.get(spaceId);
  if (!listeners) return;
  for (const listener of listeners) {
    listener(event, data);
  }
}
