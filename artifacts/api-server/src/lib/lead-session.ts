import type { Request, Response } from "express";
import { leadsTable, type Lead } from "@workspace/db";

export const LEAD_COOKIE_NAME = "policywell_lead";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function setLeadCookie(res: Response, sessionId: string) {
  res.cookie(LEAD_COOKIE_NAME, sessionId, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export function clearLeadCookie(res: Response) {
  res.clearCookie(LEAD_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function getLeadSessionId(req: Request): string | null {
  const sessionId = req.signedCookies?.[LEAD_COOKIE_NAME];
  return typeof sessionId === "string" ? sessionId : null;
}

export function toLeadSession(lead: Lead) {
  const zip = typeof lead.answers.zip === "string" ? lead.answers.zip : "";
  return {
    id: lead.id,
    product: lead.product,
    zip,
    status: lead.status,
    currentStep: lead.currentStep,
    progressPercent: lead.progressPercent,
    answers: lead.answers,
    contact: lead.contact,
    attribution: lead.attribution,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

export { leadsTable };
