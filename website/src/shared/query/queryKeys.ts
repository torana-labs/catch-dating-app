export const websiteQueryKeys = {
  all: ["website"] as const,
  claims: {
    all: () => [...websiteQueryKeys.all, "claims"] as const,
    lookup: (listingId: string | null) =>
      [...websiteQueryKeys.claims.all(), "lookup", listingId ?? "none"] as const,
    request: (listingId: string | null) =>
      [...websiteQueryKeys.claims.requests(), listingId ?? "none"] as const,
    requests: () => [...websiteQueryKeys.claims.all(), "requests"] as const,
  },
  eventMessaging: {
    senderOptions: (channel: "sms" | "rcs" | "whatsapp", instance: string, identity: string) =>
      [...websiteQueryKeys.all, "event-messaging", channel === "rcs" ? "rcs-options" : "whatsapp-options", instance, identity] as const,
    senderPreference: (channel: "sms" | "rcs" | "whatsapp", instance: string, identity: string) =>
      [...websiteQueryKeys.all, "event-messaging", channel === "rcs" ? "rcs-preference" : "whatsapp-preference", instance, identity] as const,
    messageWithdrawal: (instance: string, channel: "sms" | "whatsapp" | "rcs") =>
      [...websiteQueryKeys.all, "event-messaging", "withdrawal", channel, instance] as const,
    smsPreference: (instance: string, identity: string) =>
      [...websiteQueryKeys.all, "event-messaging", "sms-preference", instance, identity] as const,
  },
  eventRuntime: {
    conversationGraph: (eventId: string | null) =>
      [...websiteQueryKeys.all, "event-runtime", "conversation-graph",
        eventId ?? "none"] as const,
  },
  eventAssistance: {
    guest: (instanceId: string) =>
      [...websiteQueryKeys.all, "event-assistance", "guest", instanceId] as const,
    reply: (instanceId: string) =>
      [...websiteQueryKeys.all, "event-assistance", "reply", instanceId] as const,
  },
  householdRsvp: {
    view: (instanceId: string) =>
      [...websiteQueryKeys.all, "household-rsvp", "view", instanceId] as const,
    submit: (instanceId: string) =>
      [...websiteQueryKeys.all, "household-rsvp", "submit", instanceId] as const,
  },
  eventRehearsal: {
    guest: (publicRehearsalId: string) =>
      [...websiteQueryKeys.all, "event-rehearsal", "guest",
        publicRehearsalId] as const,
    action: (publicRehearsalId: string) =>
      [...websiteQueryKeys.all, "event-rehearsal", "action",
        publicRehearsalId] as const,
  },
  hostApplications: {
    submit: () => [...websiteQueryKeys.all, "host-applications", "submit"] as const,
  },
  reviews: {
    listing: (organizerId: string) =>
      [...websiteQueryKeys.all, "reviews", "listing", organizerId] as const,
  },
  waitlist: {
    submit: (variant: string) =>
      [...websiteQueryKeys.all, "waitlist", "submit", variant] as const,
  },
};
