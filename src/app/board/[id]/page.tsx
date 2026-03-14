"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/providers/user-provider";
import { BoardCanvas } from "@/components/board/board-canvas";
import { getBoard } from "@/actions/board";
import { upsertUser } from "@/actions/cards";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useRouter } from "next/navigation";
import type { Node, Edge, Space } from "@/lib/db/schema";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const userId = useUser();
  const spaceId = params.id as string;

  const [data, setData] = useState<{ space: Space; nodes: Node[]; edges: Edge[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) return;

    upsertUser(userId).catch(console.error);

    getBoard(spaceId, userId)
      .then(setData)
      .catch(() => {
        setError(true);
      });
  }, [userId, spaceId]);

  if (error) {
    router.push("/");
    return null;
  }

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
