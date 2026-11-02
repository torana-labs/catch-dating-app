import {expect, test, vi} from "vitest";
import {reportCaughtError, scrubErrorEvent, startErrorReporting} from "@catch/web-config/errorReporting";

const sentry = vi.hoisted(() => ({reportToSentry: vi.fn(), startSentry: vi.fn()}));
vi.mock("../../../packages/web-config/sentryReporter", () => sentry);

type ErrorEvent = Parameters<typeof scrubErrorEvent>[0];

const page = {origin: "https://example.test", pathname: "/users/Xk29sLq0aZpW7mTn4bVc1dEf/edit"};

function scrub(event: Partial<ErrorEvent>) {
  return scrubErrorEvent({type: undefined, ...event} as ErrorEvent, page, "Agent/1");
}

test("an error report carries no contact details, ids or link secrets", () => {
  const scrubbed = scrub({exception: {values: [{
    stacktrace: {frames: [{abs_path: "https://example.test/a.js#x", filename: "https://example.test/a.js?token=secret"}]},
    value: "person@example.test, +91 98765 43210 failed for users/Xk29sLq0aZpW7mTn4bVc at https://example.test/offer?token=secret#grant",
  }]}});
  const value = scrubbed.exception?.values?.[0];
  expect(value?.value).toBe("[email], [number] failed for users/[id] at https://example.test/offer");
  expect(value?.stacktrace?.frames?.[0]).toEqual({abs_path: "https://example.test/a.js", filename: "https://example.test/a.js"});
});

test("an error report keeps the page but drops who was on it", () => {
  const scrubbed = scrub({
    breadcrumbs: [{message: "clicked"}],
    extra: {__serialized__: {email: "person@example.test"}},
    message: "rejected for person@example.test",
    user: {id: "someone"},
  });
  expect(scrubbed.message).toBe("rejected for [email]");
  expect(scrubbed.request).toEqual({headers: {"User-Agent": "Agent/1"}, url: "https://example.test/users/:id/edit"});
  expect(scrubbed.user ?? scrubbed.breadcrumbs ?? scrubbed.extra).toBeUndefined();
});

test("an ordinary page name and message pass through unchanged", () => {
  const scrubbed = scrubErrorEvent(
    {exception: {values: [{value: "Cannot read properties of undefined (reading 'title')"}]}, type: undefined} as ErrorEvent,
    {origin: "https://example.test", pathname: "/hosts/running-clubs"},
    "Agent/1",
  );
  expect(scrubbed.exception?.values?.[0]?.value).toBe("Cannot read properties of undefined (reading 'title')");
  expect(scrubbed.request?.url).toBe("https://example.test/hosts/running-clubs");
});

test("a hostile message is cut short rather than scanned in full", () => {
  for (const hostile of ["http://".repeat(50_000), "#".repeat(300_000), `https://a/${"#".repeat(300_000)}`]) {
    const value = scrub({exception: {values: [{value: hostile, stacktrace: {frames: [{filename: hostile}]}}]}}).exception?.values?.[0];
    expect(value?.value?.length).toBeLessThanOrEqual(2000);
  }
});

test("reporting stays off on any other host and holds early errors on a listed one", async () => {
  const options = {dsn: "https://key@example.test/1", hosts: ["elsewhere.test"]};
  startErrorReporting(options);
  reportCaughtError(new Error("ignored"));
  await vi.dynamicImportSettled();
  expect(sentry.startSentry).not.toHaveBeenCalled();

  const listed = {...options, hosts: [window.location.hostname]};
  startErrorReporting(listed);
  const early = new Error("before the chunk arrived");
  window.dispatchEvent(new ErrorEvent("error", {error: early}));
  reportCaughtError(new Error("caught by a screen"));
  await vi.waitFor(() => expect(sentry.reportToSentry).toHaveBeenCalledTimes(2));
  expect(sentry.startSentry).toHaveBeenCalledWith(listed);
  expect(sentry.reportToSentry.mock.calls.map(([error]) => (error as Error).message))
    .toEqual(["before the chunk arrived", "caught by a screen"]);
});
