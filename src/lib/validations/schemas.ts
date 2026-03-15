import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const createSpaceSchema = z.object({
  userId: uuidSchema,
  name: z.string().min(1).max(100),
});

export const deleteSpaceSchema = z.object({
  userId: uuidSchema,
  spaceId: uuidSchema,
});

export const createNodeSchema = z.object({
  userId: uuidSchema,
  spaceId: uuidSchema,
  positionX: z.number().default(100),
  positionY: z.number().default(100),
});

export const updateNodePositionSchema = z.object({
  userId: uuidSchema,
  nodeId: uuidSchema,
  positionX: z.number(),
  positionY: z.number(),
});

export const deleteNodeSchema = z.object({
  userId: uuidSchema,
  nodeId: uuidSchema,
});

export const createEdgeSchema = z.object({
  userId: uuidSchema,
  spaceId: uuidSchema,
  sourceId: uuidSchema,
  targetId: uuidSchema,
});

export const deleteEdgeSchema = z.object({
  userId: uuidSchema,
  edgeId: uuidSchema,
});

export const updateCardTitleSchema = z.object({
  userId: uuidSchema,
  nodeId: uuidSchema,
  title: z.string().min(1).max(200),
});

export const updateCardContentSchema = z.object({
  userId: uuidSchema,
  nodeId: uuidSchema,
  content: z.array(z.any()).min(1),
});

export const updatePresenceSchema = z.object({
  userId: uuidSchema,
  spaceId: uuidSchema,
  browserId: z.string().min(1),
  cursorX: z.number(),
  cursorY: z.number(),
  color: z.string().min(1),
});

export const getPresenceSchema = z.object({
  spaceId: uuidSchema,
  userId: uuidSchema,
  browserId: z.string().min(1),
});

export const deletePresenceSchema = z.object({
  browserId: z.string().min(1),
});
