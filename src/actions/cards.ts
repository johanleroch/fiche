"use server";

import { db } from "@/lib/db";
import { nodes, users } from "@/lib/db/schema";
import {
  updateCardTitleSchema,
  updateCardContentSchema,
  uuidSchema,
} from "@/lib/validations/schemas";
import { eq, and } from "drizzle-orm";

export async function upsertUser(userId: string) {
  const parsed = uuidSchema.safeParse(userId);
  if (!parsed.success) throw new Error("Invalid userId");

  await db.insert(users).values({ id: parsed.data }).onConflictDoNothing();
}

export async function getCard(nodeId: string, userId: string) {
  const parsedNode = uuidSchema.safeParse(nodeId);
  const parsedUser = uuidSchema.safeParse(userId);
  if (!parsedNode.success || !parsedUser.success) throw new Error("Invalid input");

  const node = await db.query.nodes.findFirst({
    where: and(eq(nodes.id, parsedNode.data), eq(nodes.userId, parsedUser.data)),
  });

  if (!node) throw new Error("Card not found");
  return node;
}

export async function updateCardTitle(data: { userId: string; nodeId: string; title: string }) {
  const parsed = updateCardTitleSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  await db.update(nodes)
    .set({ title: parsed.data.title })
    .where(and(eq(nodes.id, parsed.data.nodeId), eq(nodes.userId, parsed.data.userId)));
}

export async function updateCardContent(data: { userId: string; nodeId: string; content: unknown[] }) {
  const parsed = updateCardContentSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  await db.update(nodes)
    .set({ content: parsed.data.content })
    .where(and(eq(nodes.id, parsed.data.nodeId), eq(nodes.userId, parsed.data.userId)));
}
