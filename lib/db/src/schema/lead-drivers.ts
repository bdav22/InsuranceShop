import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import type { LeadAnswers } from "./leads";
import { leadsTable } from "./leads";

export const leadDriversTable = pgTable("policywell_lead_drivers", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leadsTable.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  details: jsonb("details").$type<LeadAnswers>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeadDriverSchema = createInsertSchema(leadDriversTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeadDriver = z.infer<typeof insertLeadDriverSchema>;
export type LeadDriver = typeof leadDriversTable.$inferSelect;
