import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import type { LeadAnswers } from "./leads";
import { leadsTable } from "./leads";

export const leadVehiclesTable = pgTable("policywell_lead_vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leadsTable.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  details: jsonb("details").$type<LeadAnswers>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeadVehicleSchema = createInsertSchema(leadVehiclesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeadVehicle = z.infer<typeof insertLeadVehicleSchema>;
export type LeadVehicle = typeof leadVehiclesTable.$inferSelect;
