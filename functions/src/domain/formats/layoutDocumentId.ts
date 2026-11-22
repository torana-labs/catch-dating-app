/** Returns the deterministic organizer-layout document id. */
export function organizerEventSuccessLayoutDocumentId(
  organizerId: string,
  layoutId: string
): string {
  return `${organizerId}_${layoutId}`;
}
