"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeChange,
  type EdgeChange,
  type OnNodeDrag,
  type OnConnectStart,
  type OnConnectEnd,
} from "@xyflow/react";
import { CardNode, type CardNodeData } from "./card-node";
import { DeletableEdge } from "./deletable-edge";
import { CursorOverlay } from "./cursor-overlay";
import { BoardToolbar } from "./board-toolbar";
import { CardEditorSheet } from "@/components/editor/card-editor-sheet";
import { createNode, updateNodePosition, deleteNode, createEdge, deleteEdge } from "@/actions/board";
import { computeTreeLayout } from "@/lib/layout/tree-layout";
import { useRealtimeSync } from "@/lib/hooks/use-realtime-sync";
import { createBoardChannel } from "@/lib/realtime/broadcast-channel";
import { toast } from "sonner";
import type { Node as DBNode, Edge as DBEdge, Space } from "@/lib/db/schema";

const nodeTypes = { card: CardNode };
const edgeTypes = { deletable: DeletableEdge };

interface BoardCanvasProps {
  space: Space;
  initialNodes: DBNode[];
  initialEdges: DBEdge[];
  userId: string;
}

const MAX_UNDO_HISTORY = 30;

type Snapshot = { rfNodes: RFNode<CardNodeData>[]; rfEdges: RFEdge[] };

type CanvasState = {
  rfNodes: RFNode<CardNodeData>[];
  rfEdges: RFEdge[];
  selectedNodeId: string | null;
  sheetOpen: boolean;
  adding: boolean;
  history: Snapshot[];
};

type CanvasAction =
  | { type: "SET_NODES"; nodes: RFNode<CardNodeData>[] }
  | { type: "SET_EDGES"; edges: RFEdge[] }
  | { type: "OPEN_SHEET"; nodeId: string }
  | { type: "CLOSE_SHEET" }
  | { type: "SET_ADDING"; adding: boolean }
  | { type: "ADD_NODE"; node: RFNode<CardNodeData> }
  | { type: "UPDATE_NODE_DATA"; nodeId: string; title: string; content: CardNodeData["content"] }
  | { type: "SAVE_SNAPSHOT" }
  | { type: "UNDO" };

function pushSnapshot(state: CanvasState): Snapshot[] {
  const snap: Snapshot = { rfNodes: state.rfNodes, rfEdges: state.rfEdges };
  const history = [...state.history, snap];
  if (history.length > MAX_UNDO_HISTORY) history.shift();
  return history;
}

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case "SAVE_SNAPSHOT":
      return { ...state, history: pushSnapshot(state) };
    case "UNDO": {
      if (state.history.length === 0) return state;
      const history = [...state.history];
      const prev = history.pop()!;
      return { ...state, rfNodes: prev.rfNodes, rfEdges: prev.rfEdges, history };
    }
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

export function BoardCanvas(props: BoardCanvasProps) {
  return (
    <ReactFlowProvider>
      <BoardCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function BoardCanvasInner({ space, initialNodes, initialEdges, userId }: BoardCanvasProps) {
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
      type: "deletable",
    })),
    selectedNodeId: null,
    sheetOpen: false,
    adding: false,
    history: [],
  });

  const positionDebounce = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const pendingSavesRef = useRef(0);
  const connectingNodeId = useRef<string | null>(null);
  const edgeHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleteEdgeId, setShowDeleteEdgeId] = useState<string | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const timers = positionDebounce.current;
    return () => { timers.forEach((t) => clearTimeout(t)); };
  }, []);

  // Undo with Cmd+Z / Ctrl+Z — restore state and sync to DB
  const undoCountRef = useRef(0);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        undoCountRef.current += 1;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // After undo, the board-update SSE from server actions will sync other clients.
  // No extra DB sync needed here since undo restores to a state that was already persisted.

  // Listen for delete-edge custom events from DeletableEdge component
  useEffect(() => {
    const handler = async (e: Event) => {
      const edgeId = (e as CustomEvent).detail.edgeId as string;
      const snapshot = state.rfEdges;
      dispatch({ type: "SET_EDGES", edges: state.rfEdges.filter((edge) => edge.id !== edgeId) });
      try {
        await deleteEdge({ userId, edgeId });
      } catch {
        dispatch({ type: "SET_EDGES", edges: snapshot });
        toast.error("Failed to delete connection");
      }
    };
    window.addEventListener("delete-edge", handler);
    return () => window.removeEventListener("delete-edge", handler);
  }, [userId, state.rfEdges]);

  // BroadcastChannel ref for notifying other same-device tabs after local mutations
  const bcRef = useRef<ReturnType<typeof createBoardChannel> | null>(null);
  useEffect(() => {
    bcRef.current = createBoardChannel(space.id);
    return () => { bcRef.current?.close(); bcRef.current = null; };
  }, [space.id]);

  // Real-time sync via SSE + BroadcastChannel (replaces polling)
  const {
    cursors,
    onMouseMove,
    remoteSelections,
    remoteDragPositions,
    broadcastSelection,
    broadcastNodeDrag,
    clearRemoteDrag,
  } = useRealtimeSync(space.id, userId, {
    onNodesUpdate: (dbNodes) => {
      dispatch({
        type: "SET_NODES",
        nodes: dbNodes.map((n) => ({
          id: n.id,
          type: "card",
          position: { x: n.positionX, y: n.positionY },
          data: {
            title: n.title,
            content: n.content as CardNodeData["content"],
          },
        })),
      });
    },
    onEdgesUpdate: (dbEdges) => {
      dispatch({
        type: "SET_EDGES",
        edges: dbEdges.map((e) => ({
          id: e.id,
          source: e.sourceId,
          target: e.targetId,
        })),
      });
    },
  }, isDraggingRef, pendingSavesRef);

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

  const onNodeDragStart: OnNodeDrag = useCallback((_event, node) => {
    isDraggingRef.current = true;
    didDragRef.current = true;
    // Clear any lingering remote drag transition to avoid lag on local drag
    clearRemoteDrag(node.id);
    broadcastSelection(node.id);
  }, [broadcastSelection, clearRemoteDrag]);

  // Stream drag position to other users for smooth movement
  const onNodeDrag: OnNodeDrag = useCallback((_event, node) => {
    broadcastNodeDrag(node.id, node.position.x, node.position.y);
  }, [broadcastNodeDrag]);

  const onNodeDragStop: OnNodeDrag = useCallback((_event, node) => {
    isDraggingRef.current = false;
    clearRemoteDrag(node.id);
    const existing = positionDebounce.current.get(node.id);
    if (existing) clearTimeout(existing);

    pendingSavesRef.current += 1;
    const timer = setTimeout(async () => {
      try {
        await updateNodePosition({
          userId,
          nodeId: node.id,
          positionX: node.position.x,
          positionY: node.position.y,
        });
      } catch {
        toast.error("Failed to save position");
      } finally {
        pendingSavesRef.current -= 1;
      }
    }, 800);
    positionDebounce.current.set(node.id, timer);
  }, [userId]);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: RFNode) => {
    dispatch({ type: "OPEN_SHEET", nodeId: node.id });
  }, []);

  // Apply tree layout to all nodes and save positions to DB
  const applyLayout = useCallback(
    async (nodes: RFNode<CardNodeData>[], edges: RFEdge[]) => {
      const positions = computeTreeLayout(
        nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })),
        edges.map((e) => ({ source: e.source, target: e.target })),
      );

      const repositioned = nodes.map((n) => {
        const pos = positions.get(n.id);
        if (!pos) return n;
        return { ...n, position: { x: pos.x, y: pos.y } };
      });

      dispatch({ type: "SET_NODES", nodes: repositioned });

      // Save all changed positions to DB (fire and forget)
      for (const node of repositioned) {
        const original = nodes.find((n) => n.id === node.id);
        if (
          original &&
          (original.position.x !== node.position.x ||
            original.position.y !== node.position.y)
        ) {
          updateNodePosition({
            userId,
            nodeId: node.id,
            positionX: node.position.x,
            positionY: node.position.y,
          }).catch(() => {});
        }
      }

      return repositioned;
    },
    [userId],
  );

  // Click on node = create child below. Drag is excluded via didDragRef.
  const onNodeClick = useCallback(async (_event: React.MouseEvent, node: RFNode) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      broadcastSelection(node.id);
      return;
    }

    broadcastSelection(node.id);
    if (state.adding) return;

    dispatch({ type: "SET_ADDING", adding: true });

    try {
      const childNode = await createNode({
        userId,
        spaceId: space.id,
        positionX: node.position.x,
        positionY: node.position.y + 150,
      });

      const rfChild: RFNode<CardNodeData> = {
        id: childNode.id,
        type: "card",
        position: { x: childNode.positionX, y: childNode.positionY },
        data: {
          title: childNode.title,
          content: childNode.content as CardNodeData["content"],
        },
      };

      const savedEdge = await createEdge({
        userId,
        spaceId: space.id,
        sourceId: node.id,
        targetId: childNode.id,
      });

      dispatch({ type: "SET_NODES", nodes: [...state.rfNodes, rfChild] });
      dispatch({
        type: "SET_EDGES",
        edges: [...state.rfEdges, { id: savedEdge.id, source: node.id, target: childNode.id, type: "deletable" }],
      });
    } catch {
      toast.error("Failed to create card");
    } finally {
      dispatch({ type: "SET_ADDING", adding: false });
    }
  }, [broadcastSelection, userId, space.id, state.rfNodes, state.rfEdges, state.adding]);

  const onPaneClick = useCallback(() => {
    broadcastSelection(null);
  }, [broadcastSelection]);

  const onEdgeMouseEnter = useCallback((_event: React.MouseEvent, edge: RFEdge) => {
    if (edgeHoverTimer.current) clearTimeout(edgeHoverTimer.current);
    edgeHoverTimer.current = setTimeout(() => {
      setShowDeleteEdgeId(edge.id);
    }, 500);
  }, []);

  const onEdgeMouseLeave = useCallback(() => {
    if (edgeHoverTimer.current) {
      clearTimeout(edgeHoverTimer.current);
      edgeHoverTimer.current = null;
    }
    setShowDeleteEdgeId(null);
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

  const onConnectStart: OnConnectStart = useCallback((_event, { nodeId }) => {
    connectingNodeId.current = nodeId;
  }, []);

  // Mind-map: drag handle to empty canvas → create child node + edge
  const onConnectEnd: OnConnectEnd = useCallback(async (event) => {
    const parentNodeId = connectingNodeId.current;
    connectingNodeId.current = null;

    // If dropped on an existing node, onConnect handles it — skip here
    const targetIsPane = (event.target as Element).classList.contains("react-flow__pane");
    if (!targetIsPane || !parentNodeId) return;

    const position = screenToFlowPosition({
      x: (event as MouseEvent).clientX,
      y: (event as MouseEvent).clientY,
    });

    dispatch({ type: "SET_ADDING", adding: true });
    try {
      const node = await createNode({
        userId,
        spaceId: space.id,
        positionX: position.x,
        positionY: position.y,
      });

      const rfNode: RFNode<CardNodeData> = {
        id: node.id,
        type: "card",
        position: { x: node.positionX, y: node.positionY },
        data: { title: node.title, content: node.content as CardNodeData["content"] },
      };
      dispatch({ type: "ADD_NODE", node: rfNode });

      const savedEdge = await createEdge({
        userId,
        spaceId: space.id,
        sourceId: parentNodeId,
        targetId: node.id,
      });
      const newEdges = [...state.rfEdges, { id: savedEdge.id, source: parentNodeId, target: node.id, type: "deletable" }];
      const newNodes = [...state.rfNodes, rfNode];
      dispatch({ type: "SET_NODES", nodes: newNodes });
      dispatch({ type: "SET_EDGES", edges: newEdges });
    } catch {
      toast.error("Failed to create card");
    } finally {
      dispatch({ type: "SET_ADDING", adding: false });
    }
  }, [userId, space.id, state.rfEdges, state.rfNodes, screenToFlowPosition]);

  // Merge remote selections and drag positions into display nodes
  const displayNodes = useMemo(() => {
    return state.rfNodes.map((node) => {
      const selection = remoteSelections.find((s) => s.nodeId === node.id);
      const dragPos = remoteDragPositions.find((d) => d.nodeId === node.id);

      if (!selection && !dragPos) return node;

      return {
        ...node,
        ...(dragPos ? { position: { x: dragPos.x, y: dragPos.y } } : {}),
        // Smooth interpolation via CSS transition on the React Flow node wrapper
        style: dragPos
          ? { transition: "transform 80ms ease-out" }
          : node.style,
        data: {
          ...node.data,
          ...(selection ? { remoteSelectionColor: selection.color } : {}),
        },
      };
    });
  }, [state.rfNodes, remoteSelections, remoteDragPositions]);

  // Inject showDelete flag into the hovered edge
  const displayEdges = useMemo(() => {
    if (!showDeleteEdgeId) return state.rfEdges;
    return state.rfEdges.map((edge) =>
      edge.id === showDeleteEdgeId
        ? { ...edge, data: { ...edge.data, showDelete: true } }
        : edge,
    );
  }, [state.rfEdges, showDeleteEdgeId]);

  const handleAutoLayout = useCallback(async () => {
    dispatch({ type: "SAVE_SNAPSHOT" });
    await applyLayout(state.rfNodes, state.rfEdges);
  }, [state.rfNodes, state.rfEdges, applyLayout]);

  const handleCardUpdated = useCallback((nodeId: string, title: string, content: unknown[]) => {
    dispatch({
      type: "UPDATE_NODE_DATA",
      nodeId,
      title,
      content: content as CardNodeData["content"],
    });
  }, []);

  return (
    <div className="w-full h-screen relative" onMouseMove={onMouseMove}>
      <BoardToolbar boardName={space.name} onAddCard={handleAddCard} onAutoLayout={handleAutoLayout} adding={state.adding} userId={userId} />

      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "deletable" }}
        fitView
        deleteKeyCode={["Delete", "Backspace"]}
        className={`bg-background ${remoteDragPositions.length > 0 ? "remote-dragging" : ""}`}
      >
        <Background variant={BackgroundVariant.Lines} gap={32} color="#e5e7eb" lineWidth={1} />
        <Controls showInteractive={false} />
        <CursorOverlay cursors={cursors} />
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
