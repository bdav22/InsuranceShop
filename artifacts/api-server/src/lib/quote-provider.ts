import type { Lead } from "@workspace/db";
import type { QuoteCollection, QuoteOption } from "@workspace/api-zod";

export class QuoteProviderUnavailableError extends Error {}

export interface QuoteProvider {
  readonly name: string;
  quote(lead: Lead): QuoteCollection;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function makeSampleOptions(lead: Lead): QuoteOption[] {
  const zip = typeof lead.answers.zip === "string" ? lead.answers.zip : "00000";
  const vehicles = asArray(lead.answers.vehicles);
  const drivers = asArray(lead.answers.drivers);
  const claims = Number(asRecord(lead.answers).claimsCount ?? 0) || 0;
  const productBase = lead.product === "auto" ? 126 : lead.product === "home" ? 98 : 184;
  const regionalFactor = 0.91 + (Number(zip.slice(-1)) % 6) * 0.035;
  const householdFactor = lead.product === "auto"
    ? 1 + Math.max(0, vehicles.length - 1) * 0.29 + Math.max(0, drivers.length - 1) * 0.18
    : 1 + claims * 0.12;
  const base = Math.round(productBase * regionalFactor * householdFactor);
  const carrierNames = [
    "PolicyWell Sample Carrier A",
    "PolicyWell Sample Carrier B",
    "PolicyWell Sample Carrier C",
  ];
  const tiers = ["Essential example", "Balanced example", "Expanded example"];
  const adjustments = [1.18, 1, 0.84];
  const coverageLabels: Record<string, string> = lead.product === "auto"
    ? { liability: "Example 50/100/50", comprehensive: "Example $500 deductible", collision: "Example $750 deductible" }
    : lead.product === "home"
      ? { dwelling: "Example $250,000 limit", personalProperty: "Example replacement cost", deductible: "Example $1,000 deductible" }
      : { generalLiability: "Example $1,000,000 limit", property: "Example $50,000 limit", deductible: "Example $1,000 deductible" };

  return carrierNames.map((carrierName, index) => {
    const monthly = Math.round(base * adjustments[index]);
    return {
      id: `sample-${index + 1}`,
      carrierName,
      tier: tiers[index],
      monthly,
      dueToday: Math.round(monthly * 1.15),
      sixMonthTotal: monthly * 6,
      highlights: ["Fictional sample option", "No carrier has reviewed this information"],
      coverage: coverageLabels,
    };
  });
}

export class IllustrativeMockQuoteProvider implements QuoteProvider {
  readonly name = "illustrative-mock";

  quote(lead: Lead): QuoteCollection {
    return {
      illustrative: true,
      disclaimer: "Illustrative sample only — not an insurance quote, offer, or bindable coverage. These fictional options were not provided or reviewed by an insurance carrier.",
      options: makeSampleOptions(lead),
    };
  }
}

export class QrpQuoteProvider implements QuoteProvider {
  readonly name = "qrp-unconfigured";

  quote(): QuoteCollection {
    throw new QuoteProviderUnavailableError(
      "The live carrier quote service has not been connected yet.",
    );
  }
}

export function getQuoteProvider(): QuoteProvider {
  const configuredProvider = process.env.QUOTE_PROVIDER ?? "mock";
  if (configuredProvider === "mock") return new IllustrativeMockQuoteProvider();
  if (configuredProvider === "qrp") return new QrpQuoteProvider();
  throw new QuoteProviderUnavailableError("The configured quote provider is not supported.");
}
