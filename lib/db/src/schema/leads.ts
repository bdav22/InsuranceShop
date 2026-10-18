import { createInsertSchema } from "drizzle-zod";
import { jsonb, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export type LeadProduct = "auto" | "home" | "commercial";
export type LeadStatus =
  | "Started"
  | "In Progress"
  | "Completed"
  | "Contacted"
  | "Quoted"
  | "Converted"
  | "Abandoned";
export type LeadContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contactConsent: boolean;
};
export type LeadAnswers = Record<string, unknown>;
export type LeadAttribution = Record<string, string>;

export const leadsTable = pgTable("policywell_leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().unique(),
  product: text("product").$type<LeadProduct>().notNull(),
  status: text("status").$type<LeadStatus>().notNull().default("Started"),
  currentStep: text("current_step").notNull().default("zip"),
  progressPercent: integer("progress_percent").notNull().default(0),
  answers: jsonb("answers").$type<LeadAnswers>().notNull().default({}),
  contact: jsonb("contact").$type<LeadContact | null>(),
  attribution: jsonb("attribution").$type<LeadAttribution>().notNull().default({}),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastActivityAt: true,
  completedAt: true,
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
