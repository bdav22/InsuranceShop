import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leadEventsTable, leadsTable, mockQuotesTable } from "@workspace/db";
import { CreateIllustrativeQuotesResponse } from "@workspace/api-zod";
import { getLeadSessionId } from "../lib/lead-session";
import { getQuoteProvider, QuoteProviderUnavailableError } from "../lib/quote-provider";

const router: IRouter = Router();

router.post("/leads/current/quotes", async (req, res) => {
  const sessionId = getLeadSessionId(req);
  if (!sessionId) return res.status(404).json({ message: "No saved quote request was found." });
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.sessionId, sessionId)).limit(1);
  if (!lead) return res.status(404).json({ message: "No saved quote request was found." });
  if (lead.status !== "Completed" || !lead.contact?.contactConsent) {
    return res.status(409).json({ message: "Finish the quote-request steps before viewing sample options." });
  }

  try {
    const result = CreateIllustrativeQuotesResponse.parse(getQuoteProvider().quote(lead));
    await db.insert(mockQuotesTable).values({
      leadId: lead.id,
      provider: getQuoteProvider().name,
      results: result.options,
    });
    await db.insert(leadEventsTable).values({
      leadId: lead.id,
      eventType: "illustrative_samples_created",
      stepKey: "results",
      progressPercent: 100,
      metadata: {},
    });
    return res.json(result);
  } catch (error) {
    if (error instanceof QuoteProviderUnavailableError) {
      return res.status(409).json({ message: error.message });
    }
    throw error;
  }
});

export default router;
