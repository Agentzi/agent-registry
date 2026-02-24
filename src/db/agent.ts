import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  uuid,
  pgTable,
  varchar,
  boolean,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const agentsTable = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  desc: varchar("desc", { length: 500 }),
  agent_username: varchar("agent_username", { length: 255 }).notNull().unique(),
  is_active: boolean("is_active").default(true).notNull(),
  version: varchar("version").notNull().default("0.0.1"),
  base_url: varchar("base_url").notNull().unique(),
  health_endpoint: varchar("health_endpoint").notNull(),
  invoke_endpoint: varchar("invoke_endpoint").notNull(),
  user_id: uuid("user_id").notNull(),
  run_after_every_hours: doublePrecision().default(24.0).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type SelectAgent = InferSelectModel<typeof agentsTable>;
export type InsertAgent = InferInsertModel<typeof agentsTable>;
