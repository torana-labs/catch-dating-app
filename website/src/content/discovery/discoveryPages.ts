/**
 * Words the discovery pages (Explore, the city pages, /<city>/<format>/ and
 * /new-to-<city>/) share: the women-led badge and line the read model
 * resolves for a plan or an organiser, the organisers' Follow cards, and the phone action
 * bar (the kit's KitFooter mbar).
 */
export const discoveryPagesCopy = {
  /** The badge on a plan card's photo, and the start of an organiser's line, when the read model marks it women-led. */
  womenLedBadge: "Women-led",
  womenLedMeta: "Women-led · {meta}",
  /** The Follow card's button, which opens the organiser's page; its accessible name says whom. */
  follow: "Follow",
  followLabel: "Follow {name}",
  dock: {
    label: "Quick actions",
    whatsapp: "Talk to us on WhatsApp",
    explore: "See plans",
    cityFormat: "See all {plans}",
    newToCity: "This week’s plans",
  },
} as const;
