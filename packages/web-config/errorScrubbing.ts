import type {ErrorEvent} from "@sentry/browser";

const longestReportedText = 2000;

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
  return scrubUrls(text.slice(0, longestReportedText))
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu, "[email]")
    .replace(/\+?\d[\d\s-]{8,}\d/gu, "[number]")
    .replace(/\b(?=[a-z]*\d)[a-z\d]{20,}\b/giu, "[id]");
}

/** Part by part, because one pattern across a hostile message can take very long. */
function scrubUrls(text: string) {
  return text.split(/([\s"'`]+)/u)
    .map(part => /^https?:\/\//u.test(part) ? withoutQuery(part) : part)
    .join("");
}

function withoutQuery(url: string) {
  const end = url.search(/[?#]/u);
  return end < 0 ? url : url.slice(0, end);
}
