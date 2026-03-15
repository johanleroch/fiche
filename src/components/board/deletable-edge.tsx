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
