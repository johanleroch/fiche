"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
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

type EditorState = {
  title: string;
  content: unknown[];
  status: SaveStatus;
  loading: boolean;
  loadError: boolean;
};

type EditorAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; title: string; content: unknown[] }
  | { type: "LOAD_ERROR" }
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_CONTENT"; content: unknown[] }
  | { type: "SET_STATUS"; status: SaveStatus };

const initialState: EditorState = {
  title: "",
  content: DEFAULT_CONTENT,
  status: "idle",
  loading: true,
  loadError: false,
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, loadError: false };
    case "LOAD_SUCCESS":
      return { ...state, loading: false, title: action.title, content: action.content };
    case "LOAD_ERROR":
      return { ...state, loading: false, loadError: true };
    case "SET_TITLE":
      return { ...state, title: action.title };
    case "SET_CONTENT":
      return { ...state, content: action.content };
    case "SET_STATUS":
      return { ...state, status: action.status };
    default:
      return state;
  }
}

export function CardEditorSheet({ open, onOpenChange, nodeId, userId, onUpdated }: CardEditorSheetProps) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const contentRef = useRef<unknown[]>(DEFAULT_CONTENT);
  const titleRef = useRef("");

  const loadCard = useCallback(() => {
    dispatch({ type: "LOAD_START" });
    getCard(nodeId, userId)
      .then((card) => {
        const cardContent = (card.content as unknown[]) ?? DEFAULT_CONTENT;
        contentRef.current = cardContent;
        titleRef.current = card.title;
        dispatch({ type: "LOAD_SUCCESS", title: card.title, content: cardContent });
      })
      .catch(() => dispatch({ type: "LOAD_ERROR" }));
  }, [nodeId, userId]);

  useEffect(() => {
    if (!open || !nodeId) return;
    loadCard();
  }, [open, nodeId, loadCard]);

  const saveContent = useCallback(async () => {
    dispatch({ type: "SET_STATUS", status: "saving" });
    try {
      await updateCardContent({ userId, nodeId, content: contentRef.current });
      onUpdated(nodeId, titleRef.current, contentRef.current);
      dispatch({ type: "SET_STATUS", status: "saved" });
      setTimeout(() => dispatch({ type: "SET_STATUS", status: "idle" }), 2000);
    } catch {
      dispatch({ type: "SET_STATUS", status: "error" });
    }
  }, [userId, nodeId, onUpdated]);

  const handleSaveError = useCallback(() => {
    dispatch({ type: "SET_STATUS", status: "error" });
  }, []);

  const { debouncedSave, flush } = useDebouncedSave(saveContent, 800, handleSaveError);

  const handleContentChange = useCallback((value: unknown[]) => {
    contentRef.current = value;
    dispatch({ type: "SET_CONTENT", content: value });
    debouncedSave();
  }, [debouncedSave]);

  const handleTitleBlur = useCallback(async () => {
    if (!state.title.trim()) return;
    try {
      await updateCardTitle({ userId, nodeId, title: state.title.trim() });
      titleRef.current = state.title.trim();
      onUpdated(nodeId, state.title.trim(), contentRef.current);
    } catch {
      dispatch({ type: "SET_STATUS", status: "error" });
      setTimeout(() => dispatch({ type: "SET_STATUS", status: "idle" }), 2000);
    }
  }, [userId, nodeId, state.title, onUpdated]);

  const handleOpenChange = useCallback(async (isOpen: boolean) => {
    if (!isOpen) await flush();
    onOpenChange(isOpen);
  }, [flush, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-1/2 min-w-[400px] max-w-2xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <Input
            value={state.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              dispatch({ type: "SET_TITLE", title: e.target.value })
            }
            onBlur={handleTitleBlur}
            placeholder="Untitled"
            className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 h-4">
            {state.status === "saving" && <><Loader2 className="h-3 w-3 animate-spin" />Saving...</>}
            {state.status === "saved" && <><CheckCircle className="h-3 w-3 text-green-500" />Saved</>}
            {state.status === "error" && <><AlertCircle className="h-3 w-3 text-destructive" />Error saving</>}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {state.loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          ) : state.loadError ? (
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
              initialContent={state.content}
              onChange={handleContentChange}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
