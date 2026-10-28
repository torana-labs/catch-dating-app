export type MarketingRouteId =
  | "sales_demo"
  | "home"
  | "visitor_discovery"
  | "host"
  | "host_apply"
  | "organizer_search"
  | "organizer_listing"
  | "event_detail"
  | "event_runtime"
  | "event_assistance"
  | "event_offer"
  | "event_booking"
  | "event_rehearsal"
  | "event_invite"
  | "household_rsvp"
  | "public_form"
  | "claim"
  | "claim_lookup"
  | "privacy"
  | "terms"
  | "help"
  | "account_deletion"
  | "refunds"
  | "contact"
  | "not_found";

export interface MarketingRouteDefinition {
  id: MarketingRouteId;
  path: string;
}

export const marketingRouteDefinitions = [
  {id: "sales_demo", path: "/demo/:invitationId"},
  {id: "home", path: "/"},
  {id: "visitor_discovery", path: "/explore/"},
  {id: "host", path: "/host/"},
  {id: "host_apply", path: "/host/apply/"},

  {id: "organizer_search", path: "/organizers"},
  {id: "organizer_listing", path: "/organizers/*"},
  {id: "event_detail", path: "/events/:eventId"},
  {id: "event_runtime", path: "/join/:publicRuntimeId"},
  {id: "event_offer", path: "/offer"},
  {id: "event_booking", path: "/booking/:eventId"},
  {id: "event_assistance", path: "/event-update/:linkId"},
  {id: "event_rehearsal", path: "/rehearse/:publicRehearsalId"},
  {id: "event_invite", path: "/invite/:inviteToken"},
  {id: "household_rsvp", path: "/rsvp/:householdToken"},
  {id: "public_form", path: "/f/:publicFormId"},
  {id: "claim", path: "/claim"},
  {id: "claim_lookup", path: "/claim/:listing"},
  {id: "privacy", path: "/privacy/*"},
  {id: "terms", path: "/terms/*"},
  {id: "help", path: "/help/*"},
  {id: "account_deletion", path: "/delete-account/*"},
  {id: "refunds", path: "/refunds/*"},
  {id: "contact", path: "/contact/*"},
  {id: "not_found", path: "*"},
] as const satisfies readonly MarketingRouteDefinition[];

export const marketingRoutePaths = marketingRouteDefinitions.reduce(
  (paths, route) => ({
    ...paths,
    [route.id]: route.path,
  }),
  {} as Record<MarketingRouteId, string>
);

export function isOrganizerSearchPath(pathname: string) {
  return pathname === "/organizers" || pathname === "/organizers/";
}
