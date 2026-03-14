"use server";

import { db } from "@/lib/db";
import { spaces } from "@/lib/db/schema";
import { createSpaceSchema, deleteSpaceSchema, uuidSchema } from "@/lib/validations/schemas";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSpaces(userId: string) {
  const parsed = uuidSchema.safeParse(userId);
  if (!parsed.success) throw new Error("Invalid userId");

  return db.query.spaces.findMany({
    where: eq(spaces.userId, parsed.data),
    orderBy: (spaces, { desc }) => [desc(spaces.createdAt)],
  });
}

export async function createSpace(data: { userId: string; name: string }) {
  const parsed = createSpaceSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const [space] = await db.insert(spaces).values({
    userId: parsed.data.userId,
    name: parsed.data.name,
  }).returning();

  revalidatePath("/");
  return space;
}

export async function deleteSpace(data: { userId: string; spaceId: string }) {
  const parsed = deleteSpaceSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  await db.delete(spaces).where(
    and(
      eq(spaces.id, parsed.data.spaceId),
      eq(spaces.userId, parsed.data.userId)
    )
  );

  revalidatePath("/");
}
