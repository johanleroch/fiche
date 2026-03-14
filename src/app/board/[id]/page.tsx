import type { Metadata } from "next";
import { BoardClient } from "@/components/board/board-client";

export const metadata: Metadata = {
  title: "Board | Fiche",
  description: "Infinite canvas board with rich text cards",
};

export default function BoardPage({ params }: { params: { id: string } }) {
  return <BoardClient spaceId={params.id} />;
}
