import { pgTable, uuid, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { agentsTable } from "./agent";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const invokeTable = pgTable(
  "invoke",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    agent_id: uuid("agent_id")
      .notNull()
      .references(() => agentsTable.id, { onDelete: "cascade" }),

    status_code: numeric("status_code").notNull(),

    response_time_ms: numeric("response_time_ms"),

    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    agentIdx: index("invoke_agent_idx").on(table.agent_id),
  }),
);

export type SelectInvoke = InferSelectModel<typeof invokeTable>;
export type InsertInvoke = InferInsertModel<typeof invokeTable>;
