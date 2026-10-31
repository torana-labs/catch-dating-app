export function projectExternalEventDocument(event) {
  const startTime = timestampIso(event.startTime);
  if (!startTime) return null;
  const endTime = timestampIso(event.endTime);
  const primaryLink =
    event.booking.externalLinks.find((link) => link.primary) ??
    event.booking.externalLinks[0] ??
    null;
  const sourceHref =
    primaryLink?.url ?? event.externalSource?.eventUrl ?? event.externalSource?.sourceUrl;
  if (!sourceHref) return null;
  const sourceLabel = platformLabel(primaryLink?.platform ?? event.externalSource?.platform);
  return {
    canonicalHostId: event.canonicalHostId,
    projection: {
      id: event.eventId,
      title: event.title,
      activityKind: event.activity.activityKind,
      availability: event.discovery.availability,
      startTime,
      endTime,
      timezone: validTimezone(event.timezone) ? event.timezone : "UTC",
      date: eventDateLabelForTimezone(startTime, endTime, event.timezone),
      location: event.meetingPoint,
      locationDetails:
        event.locationDetails ?? event.meetingLocation?.notes ?? "",
      summary: event.description,
      priceLabel: event.price.displayText ?? "External ticketing",
      sourceLabel,
      sourceHref,
      externalLinkCount: event.booking.externalLinks.length,
      dedupeKey: event.dedupe.normalizedEventKey,
    },
  };
}

export function eventDateLabelForTimezone(startIso, endIso, timezone) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const zone = validTimezone(timezone) ? timezone : "UTC";
  const date = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: zone,
  }).format(start);
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  }).format(start);
  if (!end || Number.isNaN(end.getTime())) return `${date}, ${time}`;
  const endTime = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  }).format(end);
  return `${date}, ${time}-${endTime}`;
}

export function timestampIso(value) {
  if (!value) return null;
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  if (typeof value._seconds === "number") {
    return new Date(value._seconds * 1000).toISOString();
  }
  return null;
}

export function validTimezone(value) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en", {timeZone: value}).format(new Date());
    return true;
  } catch (_error) {
    return false;
  }
}

export function platformLabel(platform) {
  const labels = {
    bookMyShow: "BookMyShow",
    district: "District",
    luma: "Luma",
    partiful: "Partiful",
    sortMyScene: "Sort My Scene",
  };
  return labels[platform] ?? titleCaseText(platform ?? "External source");
}

export function titleCaseText(value) {
  return String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}
