"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/providers/user-provider";
import { BoardCanvas } from "@/components/board/board-canvas";
import { getBoard } from "@/actions/board";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import type { Node, Edge, Space } from "@/lib/db/schema";

interface BoardClientProps {
  spaceId: string;
}

export function BoardClient({ spaceId }: BoardClientProps) {
  const router = useRouter();
  const userId = useUser();

  const [data, setData] = useState<{ space: Space; nodes: Node[]; edges: Edge[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getBoard(spaceId, userId)
      .then(setData)
      .catch(() => setError(true));
  }, [userId, spaceId]);

  useEffect(() => {
    if (error) router.push("/");
  }, [error, router]);

  if (!userId || !data) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <BoardCanvas
      space={data.space}
      initialNodes={data.nodes}
      initialEdges={data.edges}
      userId={userId}
    />
  );
}
