"use server";

import { db } from "@/lib/db";
import { nodes, edges, spaces } from "@/lib/db/schema";
import {
  createNodeSchema,
  updateNodePositionSchema,
  deleteNodeSchema,
  createEdgeSchema,
  deleteEdgeSchema,
  uuidSchema,
} from "@/lib/validations/schemas";
import { eq, and } from "drizzle-orm";

export async function getBoard(spaceId: string, userId: string) {
  const parsedSpace = uuidSchema.safeParse(spaceId);
  const parsedUser = uuidSchema.safeParse(userId);
  if (!parsedSpace.success || !parsedUser.success) throw new Error("Invalid input");

  // Ownership check
  const space = await db.query.spaces.findFirst({
    where: and(eq(spaces.id, parsedSpace.data), eq(spaces.userId, parsedUser.data)),
  });
  if (!space) throw new Error("Space not found");

  const [boardNodes, boardEdges] = await Promise.all([
    db.query.nodes.findMany({
      where: and(eq(nodes.spaceId, parsedSpace.data), eq(nodes.userId, parsedUser.data)),
    }),
    db.query.edges.findMany({
      where: and(eq(edges.spaceId, parsedSpace.data), eq(edges.userId, parsedUser.data)),
    }),
  ]);

  return { space, nodes: boardNodes, edges: boardEdges };
}

export async function createNode(data: { userId: string; spaceId: string; positionX?: number; positionY?: number }) {
  const parsed = createNodeSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  // Ownership check
  const space = await db.query.spaces.findFirst({
    where: and(eq(spaces.id, parsed.data.spaceId), eq(spaces.userId, parsed.data.userId)),
  });
  if (!space) throw new Error("Space not found");

  const [node] = await db.insert(nodes).values({
    spaceId: parsed.data.spaceId,
    userId: parsed.data.userId,
    positionX: parsed.data.positionX,
    positionY: parsed.data.positionY,
  }).returning();

  return node;
}

export async function updateNodePosition(data: { userId: string; nodeId: string; positionX: number; positionY: number }) {
  const parsed = updateNodePositionSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  await db.update(nodes)
    .set({ positionX: parsed.data.positionX, positionY: parsed.data.positionY })
    .where(and(eq(nodes.id, parsed.data.nodeId), eq(nodes.userId, parsed.data.userId)));
}

export async function deleteNode(data: { userId: string; nodeId: string }) {
  const parsed = deleteNodeSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  await db.delete(nodes).where(
    and(eq(nodes.id, parsed.data.nodeId), eq(nodes.userId, parsed.data.userId))
  );
}

export async function createEdge(data: { userId: string; spaceId: string; sourceId: string; targetId: string }) {
  const parsed = createEdgeSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  // Ownership check
  const space = await db.query.spaces.findFirst({
    where: and(eq(spaces.id, parsed.data.spaceId), eq(spaces.userId, parsed.data.userId)),
  });
  if (!space) throw new Error("Space not found");

  const [edge] = await db.insert(edges).values({
    spaceId: parsed.data.spaceId,
    userId: parsed.data.userId,
    sourceId: parsed.data.sourceId,
    targetId: parsed.data.targetId,
  }).returning();

  return edge;
}

export async function deleteEdge(data: { userId: string; edgeId: string }) {
  const parsed = deleteEdgeSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  await db.delete(edges).where(
    and(eq(edges.id, parsed.data.edgeId), eq(edges.userId, parsed.data.userId))
  );
}
