import type { Metadata } from "next";
import { HomeClient } from "@/components/home-client";

export const metadata: Metadata = {
  title: "Fiche — My Spaces",
  description: "Visual space manager with rich text cards on infinite canvases",
};

export default function HomePage() {
  return <HomeClient />;
}
