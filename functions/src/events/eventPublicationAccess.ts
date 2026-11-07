/**
 * Publication is independent of operational lifecycle and booking provenance:
 * only an explicitly published event is public; anything else fails closed.
 * This predicate grants no organizer, booking, payment or attendee authority.
 */
export function isEventPubliclyAccessible(event: object): boolean {
  return (event as {publicationState?: unknown}).publicationState ===
    "published";
}
