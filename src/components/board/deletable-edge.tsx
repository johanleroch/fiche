"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { X } from "lucide-react";

export type DeletableEdgeData = {
  showDelete?: boolean;
};

export type DeletableEdge = Edge<DeletableEdgeData, "deletable">;

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
  data,
  interactionWidth = 20,
}: EdgeProps<DeletableEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const showDelete = data?.showDelete ?? false;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={interactionWidth}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          className="nodrag nopan"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("delete-edge", { detail: { edgeId: id } }),
            );
          }}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: showDelete ? "all" : "none",
            opacity: showDelete ? 0.7 : 0,
            transition: "opacity 150ms ease-out",
          }}
        >
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-muted-foreground/80 text-white hover:bg-destructive transition-colors duration-150">
            <X className="w-2.5 h-2.5" />
          </div>
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

export const DeletableEdge = memo(DeletableEdgeComponent);
