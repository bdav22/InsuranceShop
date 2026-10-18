import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import type { LeadAnswers } from "./leads";
import { leadsTable } from "./leads";

export const mockQuotesTable = pgTable("policywell_mock_quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leadsTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  results: jsonb("results").$type<LeadAnswers[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMockQuoteSchema = createInsertSchema(mockQuotesTable).omit({ id: true, createdAt: true });
export type InsertMockQuote = z.infer<typeof insertMockQuoteSchema>;
export type MockQuote = typeof mockQuotesTable.$inferSelect;
