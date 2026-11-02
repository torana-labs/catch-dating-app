/** Pages opened from a private link. Analytics and error reports both stay off them. */
export function isPrivateEventUpdatePath(path: string): boolean {
  return path.startsWith("/demo/") ||
    path.startsWith("/event-update/") ||
    path.startsWith("/booking/") ||
    path === "/offer" || path === "/offer/";
}
