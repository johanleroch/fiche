"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getSpaces } from "@/actions/spaces";
import { CreateSpaceDialog } from "./create-space-dialog";
import { DeleteSpaceDialog } from "./delete-space-dialog";
import { useRouter } from "next/navigation";
import { LayoutGrid, AlertCircle, RefreshCw } from "lucide-react";
import type { Space } from "@/lib/db/schema";

interface SpacesGridProps {
  userId: string;
}

export function SpacesGrid({ userId }: SpacesGridProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();

  const loadSpaces = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      const data = await getSpaces(userId);
      setSpaces(data);
    } catch {
      // CC-001: Show error state to user
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">My Spaces</h1>
        <CreateSpaceDialog userId={userId} onCreated={loadSpaces} />
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">Failed to load spaces</p>
          <Button variant="outline" onClick={loadSpaces}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      ) : spaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No spaces yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first space to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {spaces.map((space) => (
            <Card
              key={space.id}
              className="group cursor-pointer hover:shadow-md transition-shadow border"
              onClick={() => router.push(`/board/${space.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium truncate">{space.name}</CardTitle>
                <DeleteSpaceDialog
                  userId={userId}
                  spaceId={space.id}
                  spaceName={space.name}
                  onDeleted={loadSpaces}
                />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
