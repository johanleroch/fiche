"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeChange,
  type EdgeChange,
  type OnNodeDrag,
} from "@xyflow/react";
import { CardNode, type CardNodeData } from "./card-node";
import { BoardToolbar } from "./board-toolbar";
import { CardEditorSheet } from "@/components/editor/card-editor-sheet";
import { createNode, updateNodePosition, deleteNode, createEdge, deleteEdge } from "@/actions/board";
import { toast } from "sonner";
import type { Node as DBNode, Edge as DBEdge, Space } from "@/lib/db/schema";

const nodeTypes = { card: CardNode };

interface BoardCanvasProps {
  space: Space;
  initialNodes: DBNode[];
  initialEdges: DBEdge[];
  userId: string;
}

export function BoardCanvas({ space, initialNodes, initialEdges, userId }: BoardCanvasProps) {
  const [rfNodes, setRfNodes] = useState<RFNode<CardNodeData>[]>(() =>
    initialNodes.map((n) => ({
      id: n.id,
      type: "card",
      position: { x: n.positionX, y: n.positionY },
      data: {
        title: n.title,
        content: n.content as CardNodeData["content"],
      },
    }))
  );

  const [rfEdges, setRfEdges] = useState<RFEdge[]>(() =>
    initialEdges.map((e) => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
    }))
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const positionDebounce = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup debounce timers on unmount (CC-010)
  useEffect(() => {
    const timers = positionDebounce.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // L-003: Apply node deletions only after DB confirms (with rollback)
  const onNodesChange = useCallback(async (changes: NodeChange<RFNode<CardNodeData>>[]) => {
    const removeChanges = changes.filter((c) => c.type === "remove");
    const otherChanges = changes.filter((c) => c.type !== "remove");

    // Apply non-delete changes immediately
    if (otherChanges.length > 0) {
      setRfNodes((nds) => applyNodeChanges(otherChanges, nds));
    }

    // For deletions: confirm with DB first, then apply
    for (const change of removeChanges) {
      if (change.type === "remove") {
        // Optimistic removal
        setRfNodes((nds) => applyNodeChanges([change], nds));
        try {
          await deleteNode({ userId, nodeId: change.id });
        } catch {
          // Rollback: reload the board data to restore the node
          toast.error("Failed to delete card — refreshing");
          window.location.reload();
        }
      }
    }
  }, [userId]);

  // L-004: Apply edge deletions with rollback on failure
  const onEdgesChange = useCallback(async (changes: EdgeChange[]) => {
    const removeChanges = changes.filter((c) => c.type === "remove");
    const otherChanges = changes.filter((c) => c.type !== "remove");

    if (otherChanges.length > 0) {
      setRfEdges((eds) => applyEdgeChanges(otherChanges, eds));
    }

    for (const change of removeChanges) {
      if (change.type === "remove") {
        // Snapshot for rollback
        const snapshot = rfEdges;
        setRfEdges((eds) => applyEdgeChanges([change], eds));
        try {
          await deleteEdge({ userId, edgeId: change.id });
        } catch {
          // Rollback edge
          setRfEdges(snapshot);
          toast.error("Failed to delete connection");
        }
      }
    }
  }, [userId, rfEdges]);

  // L-005: Add edge to UI only after DB confirms
  const onConnect = useCallback(async (connection: Connection) => {
    try {
      const savedEdge = await createEdge({
        userId,
        spaceId: space.id,
        sourceId: connection.source,
        targetId: connection.target,
      });
      // Use DB-generated id for the edge
      setRfEdges((eds) => addEdge({ ...connection, id: savedEdge.id }, eds));
    } catch {
      toast.error("Failed to save connection");
    }
  }, [userId, space.id]);

  const onNodeDragStop: OnNodeDrag = useCallback((_event, node) => {
    const existing = positionDebounce.current.get(node.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      updateNodePosition({
        userId,
        nodeId: node.id,
        positionX: node.position.x,
        positionY: node.position.y,
      }).catch(() => toast.error("Failed to save position"));
    }, 800);

    positionDebounce.current.set(node.id, timer);
  }, [userId]);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: RFNode) => {
    setSelectedNodeId(node.id);
    setSheetOpen(true);
  }, []);

  const handleAddCard = useCallback(async () => {
    setAdding(true);
    try {
      const node = await createNode({
        userId,
        spaceId: space.id,
        positionX: 100 + Math.random() * 200,
        positionY: 100 + Math.random() * 200,
      });

      setRfNodes((nds) => [
        ...nds,
        {
          id: node.id,
          type: "card",
          position: { x: node.positionX, y: node.positionY },
          data: {
            title: node.title,
            content: node.content as CardNodeData["content"],
          },
        },
      ]);
    } catch {
      toast.error("Failed to create card");
    } finally {
      setAdding(false);
    }
  }, [userId, space.id]);

  const handleCardUpdated = useCallback((nodeId: string, title: string, content: unknown[]) => {
    setRfNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, title, content: content as CardNodeData["content"] } }
          : n
      )
    );
  }, []);

  return (
    <div className="w-full h-screen relative">
      <BoardToolbar boardName={space.name} onAddCard={handleAddCard} adding={adding} />

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Lines} gap={32} color="#e5e7eb" lineWidth={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {selectedNodeId && (
        <CardEditorSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          nodeId={selectedNodeId}
          userId={userId}
          onUpdated={handleCardUpdated}
        />
      )}
    </div>
  );
}
