export {scrubErrorEvent} from "./errorScrubbing";

export interface ErrorReportingOptions {
  dsn: string;
  /** Only these hostnames report, because a preview channel serves the same bytes. */
  hosts: readonly string[];
  /** Pages whose address or content is private to one person never report. */
  isPrivatePath?: (path: string) => boolean;
}

let reporter: Promise<typeof import("./sentryReporter") | null> | null = null;

/**
 * The SDK is a separate chunk so pages don't wait for it. Errors from before it
 * arrives are held and sent once it does. A blocked chunk just means no reports.
 */
export function startErrorReporting(options: ErrorReportingOptions) {
  if (reporter || !options.hosts.includes(window.location.hostname)) return;
  const early: unknown[] = [];
  const holdError = (event: ErrorEvent) => early.push(event.error);
  const holdRejection = (event: PromiseRejectionEvent) => early.push(event.reason);
  window.addEventListener("error", holdError);
  window.addEventListener("unhandledrejection", holdRejection);
  reporter = import("./sentryReporter").then(sentry => {
    sentry.startSentry(options);
    early.forEach(sentry.reportToSentry);
    return sentry;
  }).catch(() => null).finally(() => {
    window.removeEventListener("error", holdError);
    window.removeEventListener("unhandledrejection", holdRejection);
  });
}

/** For errors a screen catches itself, which never reach the window handlers. */
export function reportCaughtError(error: unknown) {
  void reporter?.then(sentry => sentry?.reportToSentry(error));
}
