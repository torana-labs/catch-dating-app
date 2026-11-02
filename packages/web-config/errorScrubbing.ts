import type {ErrorEvent} from "@sentry/browser";

export function scrubErrorEvent(
  event: ErrorEvent,
  page: Pick<Location, "origin" | "pathname">,
  userAgent: string,
): ErrorEvent {
  for (const value of event.exception?.values ?? []) {
    if (value.value) value.value = scrubText(value.value);
    for (const frame of value.stacktrace?.frames ?? []) {
      if (frame.filename) frame.filename = withoutQuery(frame.filename);
      if (frame.abs_path) frame.abs_path = withoutQuery(frame.abs_path);
    }
  }
  return {
    ...event,
    breadcrumbs: undefined,
    extra: undefined,
    message: event.message && scrubText(event.message),
    request: {headers: {"User-Agent": userAgent}, url: `${page.origin}${scrubPath(page.pathname)}`},
    user: undefined,
  };
}

/** Admin and event addresses can hold a person's id. */
function scrubPath(path: string) {
  return path.split("/").map(part => looksLikeId(part) ? ":id" : part).join("/");
}

function looksLikeId(part: string) {
  return part.length >= 16 && /\d/u.test(part) && /^[\w-]+$/u.test(part);
}

function scrubText(text: string) {
  return text
    .replace(/https?:\/\/[^\s"'`?#]+[?#][^\s"'`]*/gu, withoutQuery)
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu, "[email]")
    .replace(/\+?\d[\d\s-]{8,}\d/gu, "[number]")
    .replace(/\b(?=[a-z]*\d)[a-z\d]{20,}\b/giu, "[id]");
}

function withoutQuery(url: string) {
  return url.replace(/[?#].*$/u, "");
}
