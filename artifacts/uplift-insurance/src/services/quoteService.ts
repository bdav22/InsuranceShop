export type Coverage = {
  bodilyInjury: string;
  propertyDamage: string;
  comprehensive: string;
  collision: string;
  rental: boolean;
  roadside: boolean;
};

export type Quote = {
  id: string;
  carrier: string;
  plan: string;
  monthly: number;
  sixMonth: number;
  badge?: string;
  badgeTone?: 'lime' | 'teal' | 'sand';
  coverage: Coverage;
};

export const defaultCoverage: Coverage = {
  bodilyInjury: '100/300',
  propertyDamage: '100k',
  comprehensive: '$500',
  collision: '$500',
  rental: true,
  roadside: true,
};

export function getMockQuotes(coverage: Coverage = defaultCoverage): Quote[] {
  const adjustment = coverage.bodilyInjury === '250/500' ? 18 : coverage.bodilyInjury === '50/100' ? -13 : 0;
  const rentalAdjustment = coverage.rental ? 6 : 0;
  const roadsideAdjustment = coverage.roadside ? 3 : 0;
  const totalAdjustment = adjustment + rentalAdjustment + roadsideAdjustment;
  const make = (quote: Omit<Quote, 'coverage' | 'monthly' | 'sixMonth'> & { base: number }): Quote => {
    const monthly = quote.base + totalAdjustment;
    return { ...quote, monthly, sixMonth: monthly * 6, coverage };
  };
  return [
    make({ id: 'evergreen', carrier: 'Evergreen Insurance', plan: 'Essential Plus', base: 133, badge: 'Lowest price', badgeTone: 'lime' }),
    make({ id: 'summit', carrier: 'Summit Insurance', plan: 'Steady Standard', base: 147, badge: 'Lower deductible', badgeTone: 'teal' }),
    make({ id: 'harbor', carrier: 'Harbor Insurance', plan: 'Complete Road', base: 158, badge: 'Higher liability limits', badgeTone: 'sand' }),
    make({ id: 'northstar', carrier: 'Northstar Insurance', plan: 'Everyday Choice', base: 164 }),
  ];
}

export function formatMoney(value: number) {
  return `$${value.toLocaleString('en-US')}`;
}