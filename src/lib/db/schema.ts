import { pgTable, uuid, text, timestamp, jsonb, real } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const spaces = pgTable("spaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const nodes = pgTable("nodes", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id").references(() => spaces.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull().default("Untitled"),
  content: jsonb("content").notNull().default([{ type: "p", children: [{ text: "" }] }]),
  positionX: real("position_x").notNull().default(0),
  positionY: real("position_y").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const edges = pgTable("edges", {
  id: uuid("id").defaultRandom().primaryKey(),
  spaceId: uuid("space_id").references(() => spaces.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sourceId: uuid("source_id").references(() => nodes.id, { onDelete: "cascade" }).notNull(),
  targetId: uuid("target_id").references(() => nodes.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type Node = typeof nodes.$inferSelect;
export type Edge = typeof edges.$inferSelect;
