"use client";

import { useEffect, useRef } from "react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  BlockquotePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
} from "@platejs/basic-nodes/react";
import { ListPlugin } from "@platejs/list/react";
import { IndentPlugin } from "@platejs/indent/react";
import { CodeBlockPlugin } from "@platejs/code-block/react";
import type { Value } from "platejs";

interface PlateEditorProps {
  initialContent: unknown[];
  onChange: (value: unknown[]) => void;
}

const PLUGINS = [
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  BlockquotePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ListPlugin,
  IndentPlugin,
  CodeBlockPlugin,
];

export function PlateEditor({ initialContent, onChange }: PlateEditorProps) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = usePlateEditor({
    plugins: PLUGINS,
    value: initialContent as Value,
  });

  return (
    <Plate
      editor={editor}
      onChange={({ value }) => {
        onChangeRef.current(value as unknown[]);
      }}
    >
      <PlateContent
        className="min-h-[300px] outline-none px-1 py-2 text-sm leading-relaxed prose prose-sm max-w-none"
        placeholder="Start writing..."
        spellCheck
      />
    </Plate>
  );
}
