"use client";

import { memo } from "react";
import { useViewport } from "@xyflow/react";
import type { RemoteCursor } from "@/lib/hooks/use-realtime-sync";

function CursorOverlayInner({ cursors }: { cursors: RemoteCursor[] }) {
  const { x, y, zoom } = useViewport();

  if (cursors.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-50">
      {cursors.map((cursor) => {
        const screenX = cursor.cursorX * zoom + x;
        const screenY = cursor.cursorY * zoom + y;

        return (
          <div
            key={cursor.browserId}
            className="absolute left-0 top-0"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
              transition: "transform 400ms cubic-bezier(0.2, 0, 0, 1)",
              willChange: "transform",
            }}
          >
            {/* Cursor arrow SVG */}
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              className="drop-shadow-sm"
            >
              <path
                d="M0.928 0.640L15.108 11.616H7.412L3.732 19.712L0.928 0.640Z"
                fill={cursor.color}
              />
              <path
                d="M0.928 0.640L15.108 11.616H7.412L3.732 19.712L0.928 0.640Z"
                stroke="white"
                strokeWidth="1.2"
              />
            </svg>
            {/* Label */}
            <span
              className="absolute left-4 top-3 text-[10px] font-medium text-white px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm"
              style={{ backgroundColor: cursor.color }}
            >
              User
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const CursorOverlay = memo(CursorOverlayInner);
