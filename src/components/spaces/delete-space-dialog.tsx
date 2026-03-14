"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteSpace } from "@/actions/spaces";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface DeleteSpaceDialogProps {
  userId: string;
  spaceId: string;
  spaceName: string;
  onDeleted: () => void;
}

export function DeleteSpaceDialog({ userId, spaceId, spaceName, onDeleted }: DeleteSpaceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteSpace({ userId, spaceId });
      onDeleted();
      toast.success("Space deleted");
    } catch {
      toast.error("Failed to delete space");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Space</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{spaceName}&quot;? This will permanently delete all cards and connections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
