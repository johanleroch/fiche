import type { Metadata } from "next";
import { BoardClient } from "@/components/board/board-client";

export const metadata: Metadata = {
  title: "Board | Fiche",
  description: "Infinite canvas board with rich text cards",
};

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoardClient spaceId={id} />;
}
