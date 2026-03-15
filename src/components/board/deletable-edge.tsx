"use client";

import { memo, useCallback, useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";

function DeletableEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [showDelete, setShowDelete] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const onMouseEnter = useCallback(() => {
    hoverTimer.current = setTimeout(() => setShowDelete(true), 500);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setShowDelete(false);
  }, []);

  return (
    <>
      {/* Invisible wider path for easier hover targeting */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        className="react-flow__edge-interaction"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <button
          type="button"
          className="nodrag nopan"
          onClick={(e) => {
            e.stopPropagation();
            // Dispatch a remove change via the edge id — React Flow handles this
            const event = new CustomEvent("delete-edge", { detail: { edgeId: id } });
            window.dispatchEvent(event);
          }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            opacity: showDelete ? 1 : 0,
            scale: showDelete ? "1" : "0.5",
            transition: "opacity 200ms ease-out, scale 200ms ease-out",
          }}
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:scale-110 transition-all duration-150">
            <X className="w-3 h-3" />
          </div>
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

export const DeletableEdge = memo(DeletableEdgeComponent);
