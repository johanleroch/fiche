"use client";

import { Button } from "@/components/ui/button";
import { SharePanel } from "@/components/share-panel";
import { ArrowLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface BoardToolbarProps {
  boardName: string;
  onAddCard: () => void;
  adding?: boolean;
  userId: string;
}

export function BoardToolbar({ boardName, onAddCard, adding, userId }: BoardToolbarProps) {
  const router = useRouter();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-white/90 backdrop-blur border border-border rounded-xl px-4 py-2 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => router.push("/")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <span className="font-medium text-sm text-foreground px-2">{boardName}</span>
      <Button
        size="sm"
        onClick={onAddCard}
        disabled={adding}
        className="h-8"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Card
      </Button>
      <SharePanel userId={userId} />
    </div>
  );
}
