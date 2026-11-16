import {brand} from "./brand.ts";

// Copy for the not-found page (/404/ and every unknown route), from the
// Live404 board in design/source_packs/website-playbook/pages/Live404.json.
// The hrefs are route paths from design/website/routes.json; the page test
// holds each one to a registered route.

/** One way on from a missing page: a tile with its link. */
export interface NotFoundTileCopy {
  title: string;
  body: string;
  link: {label: string; href: string};
}

export const notFoundCopy = {
  kicker: "Page not found",
  title: "This page never checked in.",
  lead: "The link may be old, or the page may have moved.",
  tiles: {
    whatsOn: {
      title: "What’s on",
      /** {cities} is the live cities as a list: "A and B" or "A, B and C". */
      body: "Plans this week in {cities}.",
      link: {label: "Browse events", href: "/explore/"},
    },
    directory: {
      title: "Organizer directory",
      body: "Look up public profiles by city, format, organizer name, or review signal.",
      link: {label: "Search the directory", href: "/organizers/"},
    },
    claim: {
      title: "Claim a listing",
      body: "If you own the page you expected, start from the host route or claim search.",
      link: {label: "Claim a listing", href: "/claim/"},
    },
    host: {
      title: `Host on ${brand.name}`,
      body: "Bookings, the door and the night itself, in one app.",
      link: {label: "Open host tools", href: "/host/"},
    },
  },
  /** What’s on's body while no city is live. */
  whatsOnNoCities: "Plans this week near you.",
  home: {label: `Return to ${brand.name}`, href: "/"},
  help: {label: "Get help", href: "/help/"},
} as const satisfies {
  tiles: Record<string, NotFoundTileCopy>;
  [key: string]: unknown;
};
