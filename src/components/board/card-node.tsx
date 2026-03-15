"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

export type CardNodeData = {
  title: string;
  content: Array<{ type: string; children: Array<{ text: string }> }>;
};

export type CardNode = Node<CardNodeData, "card">;

const CardNodeComponent = ({ data, selected }: NodeProps<CardNode>) => {
  const preview = data.content
    ?.flatMap((block) => block.children?.map((c) => c.text) ?? [])
    .join(" ")
    .slice(0, 80);

  return (
    <div
      className={`
        bg-white border rounded-xl shadow-sm px-4 py-3 min-w-[200px] max-w-[260px] cursor-pointer
        transition-all duration-150
        ${selected ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border hover:shadow-md hover:border-muted-foreground/30"}
      `}
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
    </div>
  );
};

export const CardNodeComponent_ = memo(CardNodeComponent);
export { CardNodeComponent_ as CardNode };
