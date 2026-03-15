"use server";

import { db } from "@/lib/db";
import { presence } from "@/lib/db/schema";
import {
  updatePresenceSchema,
  getPresenceSchema,
  deletePresenceSchema,
} from "@/lib/validations/schemas";
import { eq, and, ne, gt } from "drizzle-orm";

export async function updateCursorPosition(data: {
  userId: string;
  spaceId: string;
  browserId: string;
  cursorX: number;
  cursorY: number;
  color: string;
}) {
  const parsed = updatePresenceSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  await db
    .insert(presence)
    .values({
      spaceId: parsed.data.spaceId,
      userId: parsed.data.userId,
      browserId: parsed.data.browserId,
      cursorX: parsed.data.cursorX,
      cursorY: parsed.data.cursorY,
      color: parsed.data.color,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: presence.browserId,
      set: {
        cursorX: parsed.data.cursorX,
        cursorY: parsed.data.cursorY,
        updatedAt: new Date(),
      },
    });
}

export async function getPresence(spaceId: string, userId: string, browserId: string) {
  const parsed = getPresenceSchema.safeParse({ spaceId, userId, browserId });
  if (!parsed.success) throw new Error("Invalid input");

  const staleThreshold = new Date(Date.now() - 10_000);

  const cursors = await db.query.presence.findMany({
    where: and(
      eq(presence.spaceId, parsed.data.spaceId),
      eq(presence.userId, parsed.data.userId),
      ne(presence.browserId, parsed.data.browserId),
      gt(presence.updatedAt, staleThreshold),
    ),
  });

  return cursors;
}

export async function removeCursor(browserId: string) {
  const parsed = deletePresenceSchema.safeParse({ browserId });
  if (!parsed.success) return;

  await db.delete(presence).where(eq(presence.browserId, parsed.data.browserId));
}
