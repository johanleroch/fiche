"use client";

import { useUser } from "@/components/providers/user-provider";
import { SpacesGrid } from "@/components/spaces/spaces-grid";
import { useEffect } from "react";
import { upsertUser } from "@/actions/cards";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const userId = useUser();

  useEffect(() => {
    if (userId) {
      upsertUser(userId).catch(console.error);
    }
  }, [userId]);

  if (!userId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <SpacesGrid userId={userId} />
      </div>
    </div>
  );
}
