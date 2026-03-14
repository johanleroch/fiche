"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Share2, Copy, Check } from "lucide-react";

interface SharePanelProps {
  userId: string;
}

export function SharePanel({ userId }: SharePanelProps) {
  const [copied, setCopied] = useState(false);

  function getShareUrl() {
    const url = new URL(window.location.href);
    // Go to home with session param
    url.pathname = "/";
    url.searchParams.set("session", userId);
    return url.toString();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Share session">
          <Share2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Share session</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Open this link in another browser to access the same spaces.
            </p>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <code className="text-xs flex-1 truncate text-muted-foreground">
              {userId}
            </code>
          </div>
          <Button className="w-full" size="sm" onClick={handleCopy}>
            {copied ? (
              <><Check className="h-4 w-4 mr-2 text-green-500" />Copied!</>
            ) : (
              <><Copy className="h-4 w-4 mr-2" />Copy share link</>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
