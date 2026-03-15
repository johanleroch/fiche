// In-memory pub/sub for SSE push (singleton per Node.js process)
// Uses globalThis to survive HMR in development

type Listener = (event: string, data: unknown) => void;

const GLOBAL_KEY = "__fiche_event_bus__" as const;

function getChannels(): Map<string, Set<Listener>> {
  const g = globalThis as unknown as Record<string, Map<string, Set<Listener>>>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map();
  }
  return g[GLOBAL_KEY];
}

export function subscribe(spaceId: string, listener: Listener): () => void {
  const channels = getChannels();
  if (!channels.has(spaceId)) {
    channels.set(spaceId, new Set());
  }
  const listeners = channels.get(spaceId)!;
  listeners.add(listener);

  // Notify all clients of the new peer count
  broadcastPeerCount(spaceId);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      channels.delete(spaceId);
    } else {
      broadcastPeerCount(spaceId);
    }
  };
}

export function publish(spaceId: string, event: string, data: unknown): void {
  const channels = getChannels();
  const listeners = channels.get(spaceId);
  if (!listeners) return;
  for (const listener of listeners) {
    listener(event, data);
  }
}

export function getPeerCount(spaceId: string): number {
  return getChannels().get(spaceId)?.size ?? 0;
}

function broadcastPeerCount(spaceId: string) {
  const count = getPeerCount(spaceId);
  publish(spaceId, "peer-count", { count });
}
