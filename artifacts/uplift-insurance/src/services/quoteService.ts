export const insuranceProducts = ['auto', 'home', 'commercial'] as const;

export type InsuranceProduct = (typeof insuranceProducts)[number];

export type QuoteLead = {
  product: InsuranceProduct;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    zip: string;
  };
  details: Record<string, string>;
};

export type QuoteResult = {
  status: 'carrier-service-not-connected';
  product: InsuranceProduct;
  message: string;
};

/**
 * Placeholder boundary for the future carrier quoting API.
 *
 * This deliberately does not calculate premiums, persist personal information,
 * contact carriers, or create coverage. Replace this implementation with the
 * secured quote-service integration once its API and credentials are available.
 */
export async function getQuote(applicationData: QuoteLead): Promise<QuoteResult> {
  return {
    status: 'carrier-service-not-connected',
    product: applicationData.product,
    message:
      'This preview has not saved or sent your details. The carrier comparison service is not connected yet, so no rates are available. Leaving this page clears your answers.',
  };
}