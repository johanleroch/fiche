"use client";

import { useEffect, useRef } from "react";
import { getBoard } from "@/actions/board";
import type { Node, Edge } from "@/lib/db/schema";

interface SyncCallbacks {
  onNodesUpdate: (nodes: Node[]) => void;
  onEdgesUpdate: (edges: Edge[]) => void;
}

export function useBoardSync(
  spaceId: string,
  userId: string,
  callbacks: SyncCallbacks,
  intervalMs = 3000
) {
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getBoard(spaceId, userId);
        callbacksRef.current.onNodesUpdate(data.nodes);
        callbacksRef.current.onEdgesUpdate(data.edges);
      } catch {
        // silently ignore poll errors
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [spaceId, userId, intervalMs]);
}
