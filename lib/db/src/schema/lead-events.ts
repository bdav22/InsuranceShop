import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import type { LeadAnswers } from "./leads";
import { leadsTable } from "./leads";

export const leadEventsTable = pgTable("policywell_lead_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leadsTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  stepKey: text("step_key"),
  progressPercent: integer("progress_percent"),
  metadata: jsonb("metadata").$type<LeadAnswers>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeadEventSchema = createInsertSchema(leadEventsTable).omit({ id: true, createdAt: true });
export type InsertLeadEvent = z.infer<typeof insertLeadEventSchema>;
export type LeadEvent = typeof leadEventsTable.$inferSelect;
