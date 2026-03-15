"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { createBoardChannel, type BoardMessage } from "@/lib/realtime/broadcast-channel";
import { getBoard } from "@/actions/board";
import type { Node, Edge } from "@/lib/db/schema";

const CURSOR_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

function pickColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export type RemoteCursor = {
  browserId: string;
  cursorX: number;
  cursorY: number;
  color: string;
};

export type RemoteSelection = {
  browserId: string;
  nodeId: string;
  color: string;
};

export type RemoteDragPosition = {
  browserId: string;
  nodeId: string;
  x: number;
  y: number;
};

interface SyncCallbacks {
  onNodesUpdate: (nodes: Node[]) => void;
  onEdgesUpdate: (edges: Edge[]) => void;
}

export function useRealtimeSync(
  spaceId: string,
  userId: string,
  callbacks: SyncCallbacks,
  isDraggingRef: React.RefObject<boolean>,
  pendingSavesRef: React.RefObject<number>,
) {
  const [browserId] = useState(() => crypto.randomUUID());
  const [color] = useState(() => pickColor(browserId));
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [remoteSelections, setRemoteSelections] = useState<RemoteSelection[]>([]);
  const [remoteDragPositions, setRemoteDragPositions] = useState<RemoteDragPosition[]>([]);
  const peerCountRef = useRef(1);
  const lastSentRef = useRef(0);
  const lastDragSentRef = useRef(0);
  const callbacksRef = useRef(callbacks);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  // Helper: upsert a cursor in the list
  const upsertCursor = useCallback((prev: RemoteCursor[], cursor: RemoteCursor) => {
    const exists = prev.find((c) => c.browserId === cursor.browserId);
    if (exists) {
      return prev.map((c) => (c.browserId === cursor.browserId ? cursor : c));
    }
    return [...prev, cursor];
  }, []);

  // Handle incoming board/cursor messages from any source (SSE or BroadcastChannel)
  const handleMessage = useCallback(
    (type: string, data: Record<string, unknown>) => {
      if (type === "board-update") {
        if (isDraggingRef.current || (pendingSavesRef.current && pendingSavesRef.current > 0)) return;
        const nodes = data.nodes as Node[];
        const edges = data.edges as Edge[];
        callbacksRef.current.onNodesUpdate(nodes);
        callbacksRef.current.onEdgesUpdate(edges);
      } else if (type === "cursor-move") {
        if ((data.browserId as string) === browserId) return;
        setCursors((prev) =>
          upsertCursor(prev, {
            browserId: data.browserId as string,
            cursorX: data.cursorX as number,
            cursorY: data.cursorY as number,
            color: data.color as string,
          }),
        );
      } else if (type === "cursor-leave") {
        const bid = data.browserId as string;
        setCursors((prev) => prev.filter((c) => c.browserId !== bid));
        // Clean up all state from this user
        setRemoteSelections((prev) => prev.filter((s) => s.browserId !== bid));
        setRemoteDragPositions((prev) => prev.filter((d) => d.browserId !== bid));
      } else if (type === "node-select") {
        if ((data.browserId as string) === browserId) return;
        setRemoteSelections((prev) => {
          const filtered = prev.filter((s) => s.browserId !== (data.browserId as string));
          return [...filtered, { browserId: data.browserId as string, nodeId: data.nodeId as string, color: data.color as string }];
        });
      } else if (type === "node-deselect") {
        if ((data.browserId as string) === browserId) return;
        setRemoteSelections((prev) => prev.filter((s) => s.browserId !== (data.browserId as string)));
      } else if (type === "node-drag") {
        if ((data.browserId as string) === browserId) return;
        setRemoteDragPositions((prev) => {
          const filtered = prev.filter((d) => d.nodeId !== (data.nodeId as string));
          return [...filtered, { browserId: data.browserId as string, nodeId: data.nodeId as string, x: data.x as number, y: data.y as number }];
        });
      }
    },
    [browserId, isDraggingRef, pendingSavesRef, upsertCursor],
  );

  // SSE connection
  useEffect(() => {
    const es = new EventSource(`/api/events/${spaceId}`);
    let isFirstOpen = true;

    es.addEventListener("board-update", (e) => {
      handleMessage("board-update", JSON.parse(e.data));
    });

    es.addEventListener("cursor-move", (e) => {
      handleMessage("cursor-move", JSON.parse(e.data));
    });

    es.addEventListener("cursor-leave", (e) => {
      handleMessage("cursor-leave", JSON.parse(e.data));
    });

    es.addEventListener("node-select", (e) => {
      handleMessage("node-select", JSON.parse(e.data));
    });

    es.addEventListener("node-deselect", (e) => {
      handleMessage("node-deselect", JSON.parse(e.data));
    });

    es.addEventListener("node-drag", (e) => {
      handleMessage("node-drag", JSON.parse(e.data));
    });

    es.addEventListener("peer-count", (e) => {
      const { count } = JSON.parse(e.data);
      peerCountRef.current = count;
    });

    // On reconnect, catch up from DB
    es.addEventListener("open", () => {
      if (isFirstOpen) {
        isFirstOpen = false;
        return;
      }
      getBoard(spaceId, userId)
        .then((data) => {
          callbacksRef.current.onNodesUpdate(data.nodes);
          callbacksRef.current.onEdgesUpdate(data.edges);
        })
        .catch(() => {});
    });

    return () => es.close();
  }, [spaceId, userId, handleMessage]);

  // BroadcastChannel for same-device tab sync
  useEffect(() => {
    const bc = createBoardChannel(spaceId);

    bc.onMessage((msg: BoardMessage) => {
      handleMessage(msg.type, msg as unknown as Record<string, unknown>);
    });

    return () => bc.close();
  }, [spaceId, handleMessage]);

  // Stale cursor cleanup (remove cursors not updated in 10s)
  useEffect(() => {
    const lastSeen = new Map<string, number>();

    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const next = prev.filter((c) => {
          const last = lastSeen.get(c.browserId) ?? now;
          return now - last < 10_000;
        });
        return next.length === prev.length ? prev : next;
      });
    }, 5_000);

    // Track when we last saw each cursor
    const origSetCursors = setCursors;
    // We track via a side effect in handleMessage — use lastSeen map
    const trackInterval = setInterval(() => {
      setCursors((prev) => {
        for (const c of prev) {
          lastSeen.set(c.browserId, Date.now());
        }
        return prev;
      });
    }, 2_000);

    return () => {
      clearInterval(interval);
      clearInterval(trackInterval);
      void origSetCursors;
    };
  }, []);

  // Throttled cursor broadcast (300ms) via both BroadcastChannel and SSE
  const bcRef = useRef<ReturnType<typeof createBoardChannel> | null>(null);

  useEffect(() => {
    bcRef.current = createBoardChannel(spaceId);
    return () => {
      bcRef.current?.close();
      bcRef.current = null;
    };
  }, [spaceId]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Skip cursor broadcasting when alone — nobody to see it
      if (peerCountRef.current <= 1) return;

      const now = Date.now();
      if (now - lastSentRef.current < 300) return;
      lastSentRef.current = now;

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const cursorData = { browserId, cursorX: flowPos.x, cursorY: flowPos.y, color };

      // BroadcastChannel (instant, same-device)
      bcRef.current?.post({ type: "cursor-move", ...cursorData });

      // SSE event bus (cross-device) — fire and forget
      fetch("/api/events/cursor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId, ...cursorData }),
      }).catch(() => {});
    },
    [browserId, color, spaceId, screenToFlowPosition],
  );

  // Broadcast node selection
  const broadcastSelection = useCallback(
    (nodeId: string | null) => {
      if (peerCountRef.current <= 1) return;

      if (nodeId) {
        bcRef.current?.post({ type: "node-select", browserId, nodeId, color });
        fetch("/api/events/cursor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spaceId, browserId, nodeId, color, type: "node-select" }),
        }).catch(() => {});
      } else {
        bcRef.current?.post({ type: "node-deselect", browserId });
        fetch("/api/events/cursor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spaceId, browserId, type: "node-deselect" }),
        }).catch(() => {});
      }
    },
    [browserId, color, spaceId],
  );

  // Broadcast node drag position (throttled ~60ms for smooth movement)
  const broadcastNodeDrag = useCallback(
    (nodeId: string, x: number, y: number) => {
      if (peerCountRef.current <= 1) return;

      const now = Date.now();
      if (now - lastDragSentRef.current < 60) return;
      lastDragSentRef.current = now;

      bcRef.current?.post({ type: "node-drag", browserId, nodeId, x, y });
      fetch("/api/events/cursor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId, browserId, nodeId, x, y, type: "node-drag" }),
      }).catch(() => {});
    },
    [browserId, spaceId],
  );

  // Clear remote drag position when drag ends (board-update will have final position)
  const clearRemoteDrag = useCallback((nodeId: string) => {
    setRemoteDragPositions((prev) => prev.filter((d) => d.nodeId !== nodeId));
  }, []);

  // Notify cursor leave on unmount
  useEffect(() => {
    const bid = browserId;
    const sid = spaceId;

    const cleanup = () => {
      const bc = createBoardChannel(sid);
      bc.post({ type: "cursor-leave", browserId: bid });
      bc.close();

      // Best-effort notify via API
      navigator.sendBeacon?.(
        "/api/events/cursor",
        new Blob(
          [JSON.stringify({ spaceId: sid, browserId: bid, type: "leave" })],
          { type: "application/json" },
        ),
      );
    };

    window.addEventListener("beforeunload", cleanup);
    return () => {
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, [browserId, spaceId]);

  return {
    cursors,
    onMouseMove,
    browserId,
    remoteSelections,
    remoteDragPositions,
    broadcastSelection,
    broadcastNodeDrag,
    clearRemoteDrag,
  };
}
