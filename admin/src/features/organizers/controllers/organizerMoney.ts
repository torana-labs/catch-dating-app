const inr = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
});

/** "₹10,000" from paise, in Indian digit grouping. */
export function formatInr(minor: number): string {
  return inr.format(Math.round(minor / 100));
}
