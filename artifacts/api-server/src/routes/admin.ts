import { Router, type IRouter, type RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import {
  db,
  leadDriversTable,
  leadEventsTable,
  leadVehiclesTable,
  leadsTable,
  mockQuotesTable,
} from "@workspace/db";
import {
  ExportAdminLeadsQueryParams,
  ListAdminLeadsQueryParams,
  UpdateAdminLeadBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const requirePolicyWellAdmin: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ message: "Sign in to access lead administration." });

  const allowedEmails = (process.env.POLICYWELL_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedEmails.length) {
    return res.status(503).json({ message: "Administrator access has not been configured yet." });
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId);
    if (!primary || primary.verification?.status !== "verified" || !allowedEmails.includes(primary.emailAddress.toLowerCase())) {
      return res.status(403).json({ message: "Your account is not authorized to view lead administration." });
    }
    return next();
  } catch {
    return res.status(503).json({ message: "Administrator access could not be checked. Please try again." });
  }
};

function filtersFor(input: {
  search?: string;
  status?: string;
  product?: string;
  dateFrom?: Date;
  dateTo?: Date;
  campaign?: string;
  purchaseTimeframe?: string;
}): SQL | undefined {
  const filters: SQL[] = [];
  if (input.status) filters.push(eq(leadsTable.status, input.status as typeof leadsTable.$inferSelect.status));
  if (input.product) filters.push(eq(leadsTable.product, input.product as typeof leadsTable.$inferSelect.product));
  if (input.search?.trim()) {
    const pattern = `%${input.search.trim()}%`;
    const matches = or(
      ilike(sql`COALESCE(${leadsTable.contact}->>'firstName', '')`, pattern),
      ilike(sql`COALESCE(${leadsTable.contact}->>'lastName', '')`, pattern),
      ilike(sql`COALESCE(${leadsTable.contact}->>'email', '')`, pattern),
      ilike(sql`COALESCE(${leadsTable.contact}->>'phone', '')`, pattern),
      ilike(sql`COALESCE(${leadsTable.answers}->>'zip', '')`, pattern),
    );
    if (matches) filters.push(matches);
  }
  if (input.dateFrom) {
    const from = new Date(input.dateFrom);
    from.setUTCHours(0, 0, 0, 0);
    filters.push(sql`${leadsTable.createdAt} >= ${from}`);
  }
  if (input.dateTo) {
    const to = new Date(input.dateTo);
    to.setUTCHours(23, 59, 59, 999);
    filters.push(sql`${leadsTable.createdAt} <= ${to}`);
  }
  if (input.campaign?.trim()) {
    filters.push(ilike(
      sql`COALESCE(${leadsTable.attribution}->>'utm_campaign', ${leadsTable.attribution}->>'campaign', '')`,
      `%${input.campaign.trim()}%`,
    ));
  }
  if (input.purchaseTimeframe?.trim()) {
    filters.push(sql`${leadsTable.answers}->>'purchaseTimeframe' = ${input.purchaseTimeframe.trim()}`);
  }
  return filters.length ? and(...filters) : undefined;
}

function toAdminLead(lead: typeof leadsTable.$inferSelect) {
  return {
    id: lead.id,
    product: lead.product,
    zip: typeof lead.answers.zip === "string" ? lead.answers.zip : "",
    status: lead.status,
    currentStep: lead.currentStep,
    progressPercent: lead.progressPercent,
    contact: lead.contact,
    attribution: lead.attribution,
    adminNote: lead.adminNote,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

router.use(requirePolicyWellAdmin);

router.get("/admin/leads/export", async (req, res) => {
  const parsed = ExportAdminLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Check the export filters and try again." });
  const where = filtersFor(parsed.data);
  const records = await db.select().from(leadsTable).where(where).orderBy(desc(leadsTable.createdAt));
  const header = ["created_at", "product", "status", "progress_percent", "zip", "first_name", "last_name", "email", "phone", "campaign"];
  const rows = records.map((lead) => [
    lead.createdAt.toISOString(),
    lead.product,
    lead.status,
    lead.progressPercent,
    lead.answers.zip,
    lead.contact?.firstName,
    lead.contact?.lastName,
    lead.contact?.email,
    lead.contact?.phone,
    lead.attribution.utm_campaign ?? lead.attribution.campaign,
  ].map(csvCell).join(","));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="policywell-leads.csv"');
  return res.send([header.join(","), ...rows].join("\r\n"));
});

router.get("/admin/leads", async (req, res) => {
  const parsed = ListAdminLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Check the search and filter values." });
  const { page, pageSize, ...filters } = parsed.data;
  const where = filtersFor(filters);
  const [items, countRows] = await Promise.all([
    db.select().from(leadsTable).where(where).orderBy(desc(leadsTable.lastActivityAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(where),
  ]);
  return res.json({ items: items.map(toAdminLead), total: countRows[0]?.count ?? 0, page, pageSize });
});

router.get("/admin/metrics", async (_req, res) => {
  const [all, statuses, products] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(leadsTable),
    db.select({ status: leadsTable.status, count: sql<number>`count(*)::int` })
      .from(leadsTable).groupBy(leadsTable.status),
    db.select({ product: leadsTable.product, count: sql<number>`count(*)::int` })
      .from(leadsTable).groupBy(leadsTable.product),
  ]);
  const byStatus = Object.fromEntries(statuses.map((entry) => [entry.status, entry.count]));
  const byProduct = Object.fromEntries(products.map((entry) => [entry.product, entry.count]));
  const totalLeads = all[0]?.count ?? 0;
  const completed = byStatus.Completed ?? 0;
  const inProgress = (byStatus.Started ?? 0) + (byStatus["In Progress"] ?? 0);
  return res.json({
    totalLeads,
    completed,
    inProgress,
    conversionPercent: totalLeads ? Math.round((completed / totalLeads) * 1000) / 10 : 0,
    byProduct,
    byStatus,
  });
});

router.get("/admin/leads/:id", async (req, res) => {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, req.params.id)).limit(1);
  if (!lead) return res.status(404).json({ message: "Lead not found." });
  const [events, quotes, vehicles, drivers] = await Promise.all([
    db.select().from(leadEventsTable).where(eq(leadEventsTable.leadId, lead.id)).orderBy(desc(leadEventsTable.createdAt)),
    db.select().from(mockQuotesTable).where(eq(mockQuotesTable.leadId, lead.id)).orderBy(desc(mockQuotesTable.createdAt)),
    db.select().from(leadVehiclesTable).where(eq(leadVehiclesTable.leadId, lead.id)).orderBy(leadVehiclesTable.position),
    db.select().from(leadDriversTable).where(eq(leadDriversTable.leadId, lead.id)).orderBy(leadDriversTable.position),
  ]);
  return res.json({
    ...toAdminLead(lead),
    answers: lead.answers,
    events: events.map(({ eventType, stepKey, progressPercent, metadata, createdAt }) => ({ eventType, stepKey, progressPercent, metadata, createdAt })),
    quotes: quotes.map(({ provider, results, createdAt }) => ({ provider, results, createdAt })),
    vehicles: vehicles.map(({ position, details }) => ({ position, details })),
    drivers: drivers.map(({ position, details }) => ({ position, details })),
  });
});

router.patch("/admin/leads/:id", async (req, res) => {
  const parsed = UpdateAdminLeadBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Enter a valid status or internal note." });
  const [existing] = await db.select().from(leadsTable).where(eq(leadsTable.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ message: "Lead not found." });

  const update: Partial<typeof leadsTable.$inferInsert> = { updatedAt: new Date(), lastActivityAt: new Date() };
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.adminNote !== undefined) update.adminNote = parsed.data.adminNote;
  const [lead] = await db.update(leadsTable).set(update).where(eq(leadsTable.id, existing.id)).returning();
  if (!lead) return res.status(500).json({ message: "The lead could not be updated." });
  await db.insert(leadEventsTable).values({
    leadId: lead.id,
    eventType: "admin_updated",
    stepKey: lead.currentStep,
    progressPercent: lead.progressPercent,
    metadata: { statusChanged: parsed.data.status !== undefined, noteUpdated: parsed.data.adminNote !== undefined },
  });
  return res.json(toAdminLead(lead));
});

router.delete("/admin/leads/:id", async (req, res) => {
  const deleted = await db.delete(leadsTable).where(eq(leadsTable.id, req.params.id)).returning({ id: leadsTable.id });
  if (!deleted.length) return res.status(404).json({ message: "Lead not found." });
  return res.status(204).end();
});

export default router;
