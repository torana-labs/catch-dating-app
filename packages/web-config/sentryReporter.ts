import {
  BrowserClient,
  captureException,
  dedupeIntegration,
  defaultStackParser,
  eventFiltersIntegration,
  getCurrentScope,
  globalHandlersIntegration,
  linkedErrorsIntegration,
  makeFetchTransport,
} from "@sentry/browser";
import {scrubErrorEvent} from "./errorScrubbing";
import type {ErrorReportingOptions} from "./errorReporting";

const staleChunkErrors = [
  /dynamically imported module/iu,
  /importing a module script failed/iu,
  /unable to preload/iu,
  /loading (?:css )?chunk/iu,
];

/**
 * Errors only: no tracing, session replay, session counts, breadcrumbs, cookies
 * or browser storage, and no IP address (userInfo defaults to on, and turning it
 * off tells Sentry not to infer one). Built from BrowserClient rather than init()
 * so the integrations this leaves out stay out of the bundle.
 */
export function startSentry({dsn, isPrivatePath}: ErrorReportingOptions) {
  const client = new BrowserClient({
    allowUrls: [window.location.origin],
    beforeSend: event => isPrivatePath?.(window.location.pathname) ?
      null : scrubErrorEvent(event, window.location, navigator.userAgent),
    dataCollection: {cookies: false, httpBodies: [], httpHeaders: false, urlQueryParams: false, userInfo: false},
    dsn,
    environment: "production",
    ignoreErrors: staleChunkErrors,
    integrations: [
      eventFiltersIntegration(),
      globalHandlersIntegration(),
      linkedErrorsIntegration(),
      dedupeIntegration(),
    ],
    sendClientReports: false,
    stackParser: defaultStackParser,
    transport: makeFetchTransport,
  });
  getCurrentScope().setClient(client);
  client.init();
}

export function reportToSentry(error: unknown) {
  captureException(error);
}
