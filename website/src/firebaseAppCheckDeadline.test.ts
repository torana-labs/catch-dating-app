import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const sdk = vi.hoisted(() => ({
  getToken: vi.fn(),
  call: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock("./firebaseConfig", () => ({
  appCheckSiteKey: "site-key",
  firebaseConfig: {apiKey: "key", appId: "app", projectId: "project"},
  claimFirebaseConfigured: true,
  eventRuntimeFirebaseConfigured: true,
  publicAnalyticsFirebaseConfigured: true,
  publicEventRegistrationFirebaseConfigured: true,
  publicFormsFirebaseConfigured: true,
  publicReviewsFirebaseConfigured: true,
}));
vi.mock("firebase/app", () => ({initializeApp: () => ({name: "app"})}));
vi.mock("firebase/app-check", () => ({
  initializeAppCheck: () => ({name: "app-check"}),
  ReCaptchaEnterpriseProvider: class {},
  getToken: sdk.getToken,
}));
vi.mock("firebase/functions", () => ({
  getFunctions: () => ({name: "functions"}),
  httpsCallable: sdk.httpsCallable,
}));
vi.mock("firebase/auth", () => ({getAuth: () => ({name: "auth"})}));
vi.mock("firebase/firestore", () => ({getFirestore: () => ({name: "firestore"})}));

import {
  createPublicOrganizerReview,
  getPublicOrganizerForm,
  getWebsiteAppCheckToken,
  recordOrganizerAnalyticsEvent,
  registerPublicEvent,
  requestOrganizerClaim,
  resolveEventInviteLanding,
} from "./firebase";

const payload = {inviteToken: "v2_link_token", sessionId: "session-1"};

beforeEach(() => {
  vi.useFakeTimers();
  sdk.getToken.mockReset();
  sdk.call.mockReset();
  sdk.httpsCallable.mockReset();
  sdk.httpsCallable.mockReturnValue(sdk.call);
  sdk.call.mockResolvedValue({data: {eventId: "event-1"}});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("website callables and App Check", () => {
  // Regression: App Check mints its token through the reCAPTCHA Enterprise
  // script, which never settles when the script is blocked, and the Functions
  // SDK starts its own timeout only after the token. The invitation page then
  // waited on resolveEventInviteLanding forever, showing its spinner.
  it("fails a call whose App Check token cannot be minted, instead of leaving it waiting", async () => {
    sdk.getToken.mockReturnValue(new Promise(() => undefined));
    const outcome = resolveEventInviteLanding(payload).then(
      () => "resolved",
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(15_000);
    const error = await outcome;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe("AppCheckDeadlineError");
    expect(sdk.call).not.toHaveBeenCalled();
  });

  it("makes the call once App Check has its token", async () => {
    sdk.getToken.mockResolvedValue({token: "app-check-token"});
    await expect(resolveEventInviteLanding(payload)).resolves.toEqual({eventId: "event-1"});
    expect(sdk.httpsCallable).toHaveBeenCalledWith({name: "functions"}, "resolveEventInviteLanding");
    expect(sdk.call).toHaveBeenCalledWith(payload);
  });

  it("still makes the call when the token exchange fails outright, as the SDK would", async () => {
    sdk.getToken.mockRejectedValue(new Error("appCheck/fetch-status-error"));
    await expect(resolveEventInviteLanding(payload)).resolves.toEqual({eventId: "event-1"});
    expect(sdk.call).toHaveBeenCalledWith(payload);
  });

  // These once called httpsCallable directly and had the same unbounded wait.
  it.each([
    ["getPublicOrganizerForm", () => getPublicOrganizerForm({} as never)],
    ["requestOrganizerClaim", () => requestOrganizerClaim({} as never)],
    ["createPublicOrganizerReview", () => createPublicOrganizerReview({} as never)],
    ["recordOrganizerAnalyticsEvent", () => recordOrganizerAnalyticsEvent({} as never)],
    ["registerPublicEvent", () => registerPublicEvent({} as never)],
  ])("bounds %s's App Check wait, and calls it once the token arrives", async (name, call) => {
    sdk.getToken.mockReturnValueOnce(new Promise(() => undefined));
    const outcome = call().then(() => "resolved", (error: unknown) => error);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(((await outcome) as Error).name).toBe("AppCheckDeadlineError");
    expect(sdk.call).not.toHaveBeenCalled();
    sdk.getToken.mockResolvedValueOnce({token: "app-check-token"});
    await expect(call()).resolves.toEqual({eventId: "event-1"});
    expect(sdk.httpsCallable).toHaveBeenCalledWith({name: "functions"}, name);
  });

  it("answers no site token, rather than waiting, when App Check cannot start", async () => {
    sdk.getToken.mockReturnValue(new Promise(() => undefined));
    const token = getWebsiteAppCheckToken();
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(token).resolves.toBeNull();
  });
});
