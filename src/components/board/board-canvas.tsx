"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
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

type CanvasState = {
  rfNodes: RFNode<CardNodeData>[];
  rfEdges: RFEdge[];
  selectedNodeId: string | null;
  sheetOpen: boolean;
  adding: boolean;
};

type CanvasAction =
  | { type: "SET_NODES"; nodes: RFNode<CardNodeData>[] }
  | { type: "SET_EDGES"; edges: RFEdge[] }
  | { type: "OPEN_SHEET"; nodeId: string }
  | { type: "CLOSE_SHEET" }
  | { type: "SET_ADDING"; adding: boolean }
  | { type: "ADD_NODE"; node: RFNode<CardNodeData> }
  | { type: "UPDATE_NODE_DATA"; nodeId: string; title: string; content: CardNodeData["content"] };

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case "SET_NODES":
      return { ...state, rfNodes: action.nodes };
    case "SET_EDGES":
      return { ...state, rfEdges: action.edges };
    case "OPEN_SHEET":
      return { ...state, selectedNodeId: action.nodeId, sheetOpen: true };
    case "CLOSE_SHEET":
      return { ...state, sheetOpen: false };
    case "SET_ADDING":
      return { ...state, adding: action.adding };
    case "ADD_NODE":
      return { ...state, rfNodes: [...state.rfNodes, action.node] };
    case "UPDATE_NODE_DATA":
      return {
        ...state,
        rfNodes: state.rfNodes.map((n) =>
          n.id === action.nodeId
            ? { ...n, data: { ...n.data, title: action.title, content: action.content } }
            : n
        ),
      };
    default:
      return state;
  }
}

export function BoardCanvas({ space, initialNodes, initialEdges, userId }: BoardCanvasProps) {
  const [state, dispatch] = useReducer(canvasReducer, {
    rfNodes: initialNodes.map((n) => ({
      id: n.id,
      type: "card",
      position: { x: n.positionX, y: n.positionY },
      data: {
        title: n.title,
        content: n.content as CardNodeData["content"],
      },
    })),
    rfEdges: initialEdges.map((e) => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
    })),
    selectedNodeId: null,
    sheetOpen: false,
    adding: false,
  });

  const positionDebounce = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = positionDebounce.current;
    return () => { timers.forEach((t) => clearTimeout(t)); };
  }, []);

  const onNodesChange = useCallback(async (changes: NodeChange<RFNode<CardNodeData>>[]) => {
    const removes = changes.filter((c) => c.type === "remove");
    const others = changes.filter((c) => c.type !== "remove");

    if (others.length > 0) {
      dispatch({ type: "SET_NODES", nodes: applyNodeChanges(others, state.rfNodes) });
    }

    for (const change of removes) {
      if (change.type === "remove") {
        dispatch({ type: "SET_NODES", nodes: applyNodeChanges([change], state.rfNodes) });
        try {
          await deleteNode({ userId, nodeId: change.id });
        } catch {
          toast.error("Failed to delete card — refreshing");
          window.location.reload();
        }
      }
    }
  }, [userId, state.rfNodes]);

  const onEdgesChange = useCallback(async (changes: EdgeChange[]) => {
    const removes = changes.filter((c) => c.type === "remove");
    const others = changes.filter((c) => c.type !== "remove");

    if (others.length > 0) {
      dispatch({ type: "SET_EDGES", edges: applyEdgeChanges(others, state.rfEdges) });
    }

    for (const change of removes) {
      if (change.type === "remove") {
        const snapshot = state.rfEdges;
        dispatch({ type: "SET_EDGES", edges: applyEdgeChanges([change], state.rfEdges) });
        try {
          await deleteEdge({ userId, edgeId: change.id });
        } catch {
          dispatch({ type: "SET_EDGES", edges: snapshot });
          toast.error("Failed to delete connection");
        }
      }
    }
  }, [userId, state.rfEdges]);

  const onConnect = useCallback(async (connection: Connection) => {
    try {
      const savedEdge = await createEdge({
        userId,
        spaceId: space.id,
        sourceId: connection.source,
        targetId: connection.target,
      });
      dispatch({
        type: "SET_EDGES",
        edges: addEdge({ ...connection, id: savedEdge.id }, state.rfEdges),
      });
    } catch {
      toast.error("Failed to save connection");
    }
  }, [userId, space.id, state.rfEdges]);

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
    dispatch({ type: "OPEN_SHEET", nodeId: node.id });
  }, []);

  const handleAddCard = useCallback(async () => {
    dispatch({ type: "SET_ADDING", adding: true });
    try {
      const node = await createNode({
        userId,
        spaceId: space.id,
        positionX: 100 + Math.random() * 200,
        positionY: 100 + Math.random() * 200,
      });
      dispatch({
        type: "ADD_NODE",
        node: {
          id: node.id,
          type: "card",
          position: { x: node.positionX, y: node.positionY },
          data: { title: node.title, content: node.content as CardNodeData["content"] },
        },
      });
    } catch {
      toast.error("Failed to create card");
    } finally {
      dispatch({ type: "SET_ADDING", adding: false });
    }
  }, [userId, space.id]);

  const handleCardUpdated = useCallback((nodeId: string, title: string, content: unknown[]) => {
    dispatch({
      type: "UPDATE_NODE_DATA",
      nodeId,
      title,
      content: content as CardNodeData["content"],
    });
  }, []);

  return (
    <div className="w-full h-screen relative">
      <BoardToolbar boardName={space.name} onAddCard={handleAddCard} adding={state.adding} />

      <ReactFlow
        nodes={state.rfNodes}
        edges={state.rfEdges}
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

      {state.selectedNodeId && (
        <CardEditorSheet
          open={state.sheetOpen}
          onOpenChange={(open) => !open && dispatch({ type: "CLOSE_SHEET" })}
          nodeId={state.selectedNodeId}
          userId={userId}
          onUpdated={handleCardUpdated}
        />
      )}
    </div>
  );
}
