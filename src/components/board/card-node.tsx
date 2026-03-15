"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Plus } from "lucide-react";

export type CardNodeData = {
  title: string;
  content: Array<{ type: string; children: Array<{ text: string }> }>;
  remoteSelectionColor?: string;
};

export type CardNode = Node<CardNodeData, "card">;

const CardNodeComponent = ({ id, data, selected }: NodeProps<CardNode>) => {
  const preview = data.content
    ?.flatMap((block) => block.children?.map((c) => c.text) ?? [])
    .join(" ")
    .slice(0, 80);

  const onAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      window.dispatchEvent(
        new CustomEvent("add-child-node", { detail: { parentId: id } }),
      );
    },
    [id],
  );

  return (
    <div
      className={`
        group relative bg-white border rounded-xl shadow-sm px-4 py-3 min-w-[200px] max-w-[260px] cursor-pointer
        transition-all duration-150
        ${selected ? "border-primary shadow-md ring-2 ring-primary/20" : data.remoteSelectionColor ? "shadow-md ring-2" : "border-border hover:shadow-md hover:border-muted-foreground/30"}
      `}
      style={data.remoteSelectionColor && !selected ? {
        borderColor: data.remoteSelectionColor,
        boxShadow: `0 0 0 3px ${data.remoteSelectionColor}33`,
      } : undefined}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground/40 !border-none !w-2 !h-2" />
      <div className="font-medium text-sm text-foreground truncate mb-1">
        {data.title || "Untitled"}
      </div>
      {preview && (
        <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {preview}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary/60 !border-2 !border-primary !w-3 !h-3 hover:!bg-primary hover:!scale-125 !transition-all !duration-150"
      />
      {/* Add child button — right side, doesn't block bottom handle */}
      <button
        type="button"
        onClick={onAddChild}
        className="nodrag nopan absolute -right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:scale-110 transition-all duration-150 shadow-sm"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};

export const CardNodeComponent_ = memo(CardNodeComponent);
export { CardNodeComponent_ as CardNode };
