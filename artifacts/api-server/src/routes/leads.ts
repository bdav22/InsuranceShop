import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  leadDriversTable,
  leadEventsTable,
  leadVehiclesTable,
  leadsTable,
  type LeadAnswers,
} from "@workspace/db";
import { StartLeadBody, UpdateCurrentLeadBody } from "@workspace/api-zod";
import { clearLeadCookie, getLeadSessionId, setLeadCookie, toLeadSession } from "../lib/lead-session";

const router: IRouter = Router();

function cleanAttribution(input: Record<string, string> | undefined): Record<string, string> {
  if (!input) return {};
  const allowed = /^(utm_(source|medium|campaign|term|content)|gclid|fbclid|campaign|source|medium)$/;
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key, value]) => allowed.test(key) && typeof value === "string")
      .slice(0, 10)
      .map(([key, value]) => [key, value.slice(0, 200)]),
  );
}

function recordArray(value: unknown): LeadAnswers[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object" && !Array.isArray(item))
    .slice(0, 10) as LeadAnswers[];
}

async function replaceRelatedRecords(leadId: string, answers: LeadAnswers) {
  const vehicles = recordArray(answers.vehicles);
  const drivers = recordArray(answers.drivers);
  await db.transaction(async (tx) => {
    await tx.delete(leadVehiclesTable).where(eq(leadVehiclesTable.leadId, leadId));
    await tx.delete(leadDriversTable).where(eq(leadDriversTable.leadId, leadId));
    if (vehicles.length) {
      await tx.insert(leadVehiclesTable).values(
        vehicles.map((details, position) => ({ leadId, position, details })),
      );
    }
    if (drivers.length) {
      await tx.insert(leadDriversTable).values(
        drivers.map((details, position) => ({ leadId, position, details })),
      );
    }
  });
}

router.post("/leads", async (req, res) => {
  const parsed = StartLeadBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Enter a valid product and five-digit ZIP code." });

  const { product, zip } = parsed.data;
  const attribution = cleanAttribution(parsed.data.attribution);
  const currentSessionId = getLeadSessionId(req);
  if (currentSessionId) {
    const [existing] = await db.select().from(leadsTable).where(eq(leadsTable.sessionId, currentSessionId)).limit(1);
    if (existing && existing.product === product && existing.answers.zip === zip) {
      setLeadCookie(res, existing.sessionId);
      return res.status(201).json(toLeadSession(existing));
    }
  }

  const sessionId = randomUUID();
  const [lead] = await db.insert(leadsTable).values({
    sessionId,
    product,
    status: "Started",
    currentStep: "coverage",
    progressPercent: 0,
    answers: { zip },
    attribution,
  }).returning();
  if (!lead) return res.status(500).json({ message: "We could not start your request. Please try again." });

  await db.insert(leadEventsTable).values({
    leadId: lead.id,
    eventType: "lead_started",
    stepKey: "product_zip",
    progressPercent: 0,
    metadata: { product },
  });
  setLeadCookie(res, sessionId);
  return res.status(201).json(toLeadSession(lead));
});

router.get("/leads/current", async (req, res) => {
  const sessionId = getLeadSessionId(req);
  if (!sessionId) return res.status(404).json({ message: "No saved quote request was found." });
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.sessionId, sessionId)).limit(1);
  if (!lead) {
    clearLeadCookie(res);
    return res.status(404).json({ message: "No saved quote request was found." });
  }
  return res.json(toLeadSession(lead));
});

router.patch("/leads/current", async (req, res) => {
  const parsed = UpdateCurrentLeadBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Check the current answer and try again." });
  const sessionId = getLeadSessionId(req);
  if (!sessionId) return res.status(404).json({ message: "No saved quote request was found." });
  const [current] = await db.select().from(leadsTable).where(eq(leadsTable.sessionId, sessionId)).limit(1);
  if (!current) return res.status(404).json({ message: "No saved quote request was found." });

  const answers = { ...parsed.data.answers, zip: current.answers.zip } as LeadAnswers;
  const contact = parsed.data.contact === undefined
    ? current.contact
    : parsed.data.contact?.contactConsent
      ? parsed.data.contact
      : null;
  if (parsed.data.progressPercent === 100 && !contact?.contactConsent) {
    return res.status(400).json({ message: "Please agree to the quote-request contact notice before continuing." });
  }

  const complete = parsed.data.progressPercent === 100;
  const [updated] = await db.update(leadsTable).set({
    currentStep: parsed.data.currentStep,
    progressPercent: parsed.data.progressPercent,
    answers,
    contact,
    status: complete ? "Completed" : parsed.data.progressPercent > 0 ? "In Progress" : "Started",
    completedAt: complete ? new Date() : current.completedAt,
    lastActivityAt: new Date(),
  }).where(eq(leadsTable.id, current.id)).returning();
  if (!updated) return res.status(500).json({ message: "We could not save this step. Please try again." });

  await replaceRelatedRecords(current.id, answers);
  await db.insert(leadEventsTable).values({
    leadId: current.id,
    eventType: complete ? "lead_completed" : "step_saved",
    stepKey: parsed.data.currentStep,
    progressPercent: parsed.data.progressPercent,
    metadata: {},
  });
  return res.json(toLeadSession(updated));
});

router.delete("/leads/current", async (req, res) => {
  const sessionId = getLeadSessionId(req);
  if (!sessionId) return res.status(404).json({ message: "No saved quote request was found." });
  const deleted = await db.delete(leadsTable).where(eq(leadsTable.sessionId, sessionId)).returning({ id: leadsTable.id });
  clearLeadCookie(res);
  if (!deleted.length) return res.status(404).json({ message: "No saved quote request was found." });
  return res.status(204).end();
});

export default router;
