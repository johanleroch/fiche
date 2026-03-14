/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCard, updateCardTitle, updateCardContent } from "@/actions/cards";
import { useDebouncedSave } from "@/lib/hooks/use-debounced-save";
import { PlateEditor } from "./plate-editor";
import { CheckCircle, Loader2, AlertCircle, RefreshCw } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface CardEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  userId: string;
  onUpdated: (nodeId: string, title: string, content: unknown[]) => void;
}

const DEFAULT_CONTENT = [{ type: "p", children: [{ text: "" }] }];

export function CardEditorSheet({ open, onOpenChange, nodeId, userId, onUpdated }: CardEditorSheetProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<unknown[]>(DEFAULT_CONTENT);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const contentRef = useRef<unknown[]>(DEFAULT_CONTENT);
  const titleRef = useRef("");

  const loadCard = useCallback(() => {
    setLoadError(false);
    setLoading(true);
    getCard(nodeId, userId)
      .then((card) => {
        const cardContent = (card.content as unknown[]) ?? DEFAULT_CONTENT;
        setTitle(card.title);
        setContent(cardContent);
        contentRef.current = cardContent;
        titleRef.current = card.title;
      })
      .catch(() => {
        // L-007: show error state with retry
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [nodeId, userId]);

  // Load card data when sheet opens
  useEffect(() => {
    if (!open || !nodeId) return;
    loadCard();
  }, [open, nodeId, loadCard]);

  const handleSaveError = useCallback(() => {
    setStatus("error");
  }, []);

  const saveContent = useCallback(async () => {
    setStatus("saving");
    try {
      await updateCardContent({ userId, nodeId, content: contentRef.current });
      onUpdated(nodeId, titleRef.current, contentRef.current);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }, [userId, nodeId, onUpdated]);

  const { debouncedSave, flush } = useDebouncedSave(saveContent, 800, handleSaveError);

  const handleContentChange = useCallback((value: unknown[]) => {
    contentRef.current = value;
    setContent(value);
    debouncedSave();
  }, [debouncedSave]);

  // L-002: Show error feedback on title save failure
  const handleTitleBlur = useCallback(async () => {
    if (!title.trim()) return;
    try {
      await updateCardTitle({ userId, nodeId, title: title.trim() });
      titleRef.current = title.trim();
      onUpdated(nodeId, title.trim(), contentRef.current);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [userId, nodeId, title, onUpdated]);

  const handleOpenChange = useCallback(async (isOpen: boolean) => {
    if (!isOpen) {
      await flush();
    }
    onOpenChange(isOpen);
  }, [flush, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-1/2 min-w-[400px] max-w-2xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <Input
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Untitled"
            className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 h-4">
            {status === "saving" && <><Loader2 className="h-3 w-3 animate-spin" />Saving...</>}
            {status === "saved" && <><CheckCircle className="h-3 w-3 text-green-500" />Saved</>}
            {status === "error" && <><AlertCircle className="h-3 w-3 text-destructive" />Error saving</>}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          ) : loadError ? (
            // L-007: Error state with retry
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Failed to load card content</p>
              <Button variant="outline" size="sm" onClick={loadCard}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <PlateEditor
              key={nodeId}
              initialContent={content}
              onChange={handleContentChange}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
