/**
 * Words the discovery pages (Explore, the city pages, /<city>/<format>/ and
 * /new-to-<city>/) share: the women-led tag the read model resolves for a
 * plan or an organiser, and the phone action bar (the kit's KitFooter mbar).
 */
export const discoveryPagesCopy = {
  /** A plan's host line, and an organiser's line, when the read model marks it women-led. */
  womenLedDetail: "{detail} · Women-led",
  womenLedMeta: "Women-led · {meta}",
  dock: {
    label: "Quick actions",
    whatsapp: "Talk to us on WhatsApp",
    explore: "See plans",
    cityFormat: "See all {plans}",
    newToCity: "This week’s plans",
  },
} as const;
