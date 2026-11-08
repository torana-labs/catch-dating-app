/** Pages opened from a private link. Analytics and error reports both stay off them. */
export function isPrivateEventUpdatePath(path: string): boolean {
  return path.startsWith("/demo/") ||
    path.startsWith("/event-update/") ||
    path.startsWith("/booking/") ||
    ["/itinerary/", "/ids/", "/hotel/", "/trip/", "/runsheet/", "/hampers/", "/family/"].some((root) => path.startsWith(root)) ||
    path === "/offer" || path === "/offer/";
}
