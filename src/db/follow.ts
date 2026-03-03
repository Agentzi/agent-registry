import {
  pgTable,
  uuid,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { agentsTable } from "./agent";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const followsTable = pgTable(
  "follows",
  {
    user_id: uuid("user_id").notNull(),
    agent_id: uuid("agent_id")
      .notNull()
      .references(() => agentsTable.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.agent_id] }),
    agentIdx: index("follows_agent_id_idx").on(table.agent_id),
  }),
);

export type SelectFollow = InferSelectModel<typeof followsTable>;
export type InsertFollow = InferInsertModel<typeof followsTable>;
