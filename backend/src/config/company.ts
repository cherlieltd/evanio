/**
 * Company contact details for transactional email and Stripe copy.
 * Keep in sync with frontend/web/src/config/company.ts.
 */
export const company = {
  legalName: "Evanio Technologies LLC",
  brand: "Evanio.ai",
  website: "https://evanio.ai",
  stateOfFormation: "Texas",
  governingLaw: "State of Texas",
  venue: "state or federal courts located in Travis County, Texas",
  address: {
    line1: "605 W 9th Street",
    line2: "Unit #4181",
    city: "Austin",
    state: "TX",
    zip: "78701",
    country: "United States",
  },
  emails: {
    hello: "hello@evanio.ai",
    billing: "billing@evanio.ai",
    notifications: "notifications@evanio.ai",
    noreply: "noreply@evanio.ai",
  },
  supportEmail: "hello@evanio.ai",
  privacyEmail: "hello@evanio.ai",
  legalEmail: "hello@evanio.ai",
} as const;

export type CompanyAddress = typeof company.address;

export function formatAddress(
  address: CompanyAddress = company.address,
  style: "one-line" | "multi-line" = "one-line",
): string {
  const cityLine = `${address.city}, ${address.state} ${address.zip}`;

  if (style === "multi-line") {
    return [address.line1, address.line2, cityLine, address.country]
      .filter(Boolean)
      .join("\n");
  }

  return [address.line1, address.line2, cityLine].filter(Boolean).join(", ");
}
