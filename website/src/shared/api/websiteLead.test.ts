import Ajv from "ajv";
import addFormats from "ajv-formats";
import {readFileSync} from "node:fs";
import {afterEach, describe, expect, it, vi} from "vitest";
import {isJoinWaitlistHttpRequest, type JoinWaitlistHTTPRequest} from "./joinWaitlistContract";
import {
  createWebsiteLeadSubmission,
  websiteLeadProblems,
  websiteLeadRequest,
  websiteLeadRequestId,
  websiteLeadSourcePage,
  type WebsiteLeadForm,
  type WebsiteLeadKind,
  type WebsiteLeadMessages,
} from "./websiteLead";

const getWebsiteAppCheckToken = vi.hoisted(() => vi.fn(async (): Promise<string | null> => "site-token"));
const getWebsiteReferrerIdToken = vi.hoisted(() => vi.fn(async (): Promise<string | null> => null));
vi.mock("../../firebase", () => ({getWebsiteAppCheckToken, getWebsiteReferrerIdToken}));

afterEach(() => {
  vi.unstubAllGlobals();
  getWebsiteAppCheckToken.mockClear();
  getWebsiteReferrerIdToken.mockReset();
  getWebsiteReferrerIdToken.mockResolvedValue(null);
});

const shared = {phone: "98123 45678", consentVersion: "lead-2026-11", sourcePage: "/run-clubs/?utm_source=ig#form", entry: "rc-wa"};
const forms: {[Kind in WebsiteLeadKind]: WebsiteLeadForm<Kind>} = {
  guide: {...shared, kind: "guide", answers: {format: "run_club"}},
  walkthrough: {...shared, kind: "walkthrough", fullName: "  Asha   Rao ", answers: {preferredTime: "Tue 18 · 16:00 IST", organisation: "Sunday Runners"}},
  demo: {...shared, kind: "demo", fullName: "Asha Rao", answers: {whatYouHost: "A monthly supper club"}},
  venue: {...shared, kind: "venue", answers: {spaceName: "The Loft", area: "Lower Parel, Mumbai", capacity: "60 standing", nights: "Tuesdays"}},
  story: {...shared, kind: "story", answers: {communityName: "Sunday Runners", cadence: "A weekly 5k for 40"}},
  referral: {...shared, kind: "referral", fullName: "Asha Rao", answers: {hostName: "Lantern Lane", hostLink: "@lanternlanesocial", relationship: "I go every month"}},
  org_contact: {...shared, kind: "org_contact", answers: {orgType: "college", orgName: "St. Xavier’s Music Society"}},
  city_alerts: {...shared, kind: "city_alerts", city: "Mumbai", cityId: "in-mh-mumbai", countryIsoCode: "IN", answers: {interests: ["runs", "dinners"]}},
  app_link: {...shared, kind: "app_link", answers: {app: "host"}},
};
const payloadKeys = ["guide", "walkthrough", "demo", "venue", "story", "referral", "orgContact", "cityAlerts", "appLink"];
const messages: WebsiteLeadMessages = Object.fromEntries(websiteLeadProblems.map((problem) => [problem, `copy:${problem}`])) as unknown as WebsiteLeadMessages;
const requestId = "0b6f4a1e2c3d4e5f8a9b0c1d2e3f4a5b";
const receipt = (isNew = true) => new Response(JSON.stringify({ok: true, alreadyJoined: !isNew,
  lead: {leadId: "f".repeat(64), requestKind: "guide", isNew}}), {status: 200});
const refusal = (status: number) => new Response(JSON.stringify({error: "refused"}), {status});

/**
 * The authored contract the backend's generated validator compiles. The
 * browser matcher behind isJoinWaitlistHttpRequest does not evaluate the
 * per-kind conditions (a walkthrough's name, city alerts' city), so bodies
 * are checked against both.
 */
const backendAccepts = (() => {
  const ajv = new Ajv({allErrors: true, strict: false});
  addFormats(ajv);
  return ajv.compile(JSON.parse(readFileSync("../contracts/http/join_waitlist_request.schema.json", "utf8")));
})();
const contractAccepts = (body: unknown) => backendAccepts(body) && isJoinWaitlistHttpRequest(body);

function sentBodies(post: ReturnType<typeof vi.fn>): JoinWaitlistHTTPRequest[] {
  return post.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)) as JoinWaitlistHTTPRequest);
}

describe("websiteLeadRequest", () => {
  it.each(Object.keys(forms) as WebsiteLeadKind[])("builds a %s lead the join-waitlist contract accepts", (kind) => {
    const body = websiteLeadRequest(forms[kind], "+919812345678", requestId);
    expect(contractAccepts(body)).toBe(true);
    expect(body).toMatchObject({requestKind: kind, website: "", lead: {
      requestId, phone: "+919812345678", sourcePage: "/run-clubs/", entry: "rc-wa",
      consent: {purpose: kind === "city_alerts" ? "cityNewPlans" : "leadFollowUp", version: "lead-2026-11"},
    }});
    // Exactly one payload, named for the kind.
    expect(payloadKeys.filter((key) => key in (body.lead ?? {}))).toHaveLength(1);
    expect(body).not.toHaveProperty("role");
  });

  it("compacts the name, drops empty optional fields and keeps city alerts' catalog city", () => {
    expect(websiteLeadRequest(forms.walkthrough, "+919812345678", requestId).fullName).toBe("Asha Rao");
    const guide = websiteLeadRequest({...forms.guide, fullName: "  ", city: ""}, "+919812345678", requestId);
    expect(guide).not.toHaveProperty("fullName");
    expect(guide).not.toHaveProperty("city");
    expect(websiteLeadRequest(forms.city_alerts, "+919812345678", requestId))
      .toMatchObject({city: "Mumbai", cityId: "in-mh-mumbai", countryIsoCode: "IN", lead: {cityAlerts: {interests: ["runs", "dinners"]}}});
  });

  it("is refused by the contract where a kind's required name or city is missing", () => {
    const unnamed = {...forms.demo, fullName: ""} as WebsiteLeadForm;
    expect(backendAccepts(websiteLeadRequest(unnamed, "+919812345678", requestId))).toBe(false);
    const cityless = {...forms.city_alerts, city: ""} as WebsiteLeadForm;
    expect(backendAccepts(websiteLeadRequest(cityless, "+919812345678", requestId))).toBe(false);
  });
});

describe("website lead fields", () => {
  it("sends the number as E.164 and refuses one that is not a mobile number", async () => {
    const post = vi.fn(async () => receipt());
    const lead = createWebsiteLeadSubmission({messages, phoneCountry: "IN", post: post as unknown as typeof fetch,
      newRequestId: () => "request000000000001", appCheckToken: async () => null});
    await expect(lead.submit({...forms.guide, phone: "12345678"})).resolves.toMatchObject({status: "invalid_phone"});
    expect(post).not.toHaveBeenCalled();
    await lead.submit({...forms.guide, phone: "098123-45678"});
    expect(JSON.parse(String((post.mock.calls[0] as unknown as [string, RequestInit])[1].body)).lead.phone).toBe("+919812345678");
  });

  it("says where it came from without the query or fragment", () => {
    expect(websiteLeadSourcePage("/mumbai/?utm_source=ig#notify")).toBe("/mumbai/");
    expect(websiteLeadSourcePage("run-clubs/")).toBe("/run-clubs/");
    expect(websiteLeadSourcePage("")).toBe("/");
  });

  it("makes a request id the contract accepts", () => {
    expect(websiteLeadRequestId(() => "0b6f4a1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b")).toBe(requestId);
    expect(websiteLeadRequestId()).toMatch(/^[a-f0-9]{32}$/u);
  });
});

describe("createWebsiteLeadSubmission", () => {
  const submission = (post: ReturnType<typeof vi.fn>, appCheckToken?: () => Promise<string | null>) => {
    let next = 0;
    return createWebsiteLeadSubmission({messages, phoneCountry: "IN", post: post as unknown as typeof fetch,
      newRequestId: () => `request${String(++next).padStart(12, "0")}`, ...(appCheckToken ? {appCheckToken} : {})});
  };

  it("posts the lead with the site's App Check token by default", async () => {
    const post = vi.fn(async () => receipt());
    await expect(submission(post).submit(forms.guide)).resolves.toEqual({status: "sent", leadId: "f".repeat(64), isNew: true});
    expect(getWebsiteAppCheckToken).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith("/api/join-waitlist", expect.objectContaining({method: "POST",
      headers: {"Content-Type": "application/json", "X-Firebase-AppCheck": "site-token"}}));
    expect(contractAccepts(sentBodies(post)[0])).toBe(true);
  });

  it("still sends, without the header, when there is no token or getting one fails", async () => {
    const post = vi.fn(async () => receipt());
    await submission(post, async () => null).submit(forms.guide);
    await submission(post, async () => {throw new Error("recaptcha blocked");}).submit(forms.guide);
    expect(post).toHaveBeenCalledTimes(2);
    for (const call of post.mock.calls as unknown as [string, RequestInit][]) {
      expect(call[1].headers).toEqual({"Content-Type": "application/json"});
    }
  });

  it("credits a signed-in referrer with the account's ID token, and only on a referral", async () => {
    getWebsiteReferrerIdToken.mockResolvedValue("referrer-id-token");
    const post = vi.fn(async () => receipt());
    await submission(post).submit(forms.referral);
    await submission(post).submit(forms.guide);
    await submission(post).submit(forms.city_alerts);
    const headers = (post.mock.calls as unknown as [string, RequestInit][]).map(([, init]) => init.headers);
    expect(headers).toEqual([
      {"Content-Type": "application/json", "X-Firebase-AppCheck": "site-token", Authorization: "Bearer referrer-id-token"},
      {"Content-Type": "application/json", "X-Firebase-AppCheck": "site-token"},
      {"Content-Type": "application/json", "X-Firebase-AppCheck": "site-token"},
    ]);
    // Other kinds never load the account.
    expect(getWebsiteReferrerIdToken).toHaveBeenCalledOnce();
    // The token rides only in the header, never in the lead's body.
    expect(JSON.stringify(sentBodies(post)[0])).not.toContain("referrer-id-token");
    expect(contractAccepts(sentBodies(post)[0])).toBe(true);
  });

  it("sends a signed-out referral as before, without an Authorization header, even when reading the account fails", async () => {
    const post = vi.fn(async () => receipt());
    await submission(post).submit(forms.referral);
    getWebsiteReferrerIdToken.mockRejectedValueOnce(new Error("auth unavailable"));
    await submission(post).submit(forms.referral);
    expect(getWebsiteReferrerIdToken).toHaveBeenCalledTimes(2);
    for (const call of post.mock.calls as unknown as [string, RequestInit][]) {
      expect(call[1].headers).toEqual({"Content-Type": "application/json", "X-Firebase-AppCheck": "site-token"});
    }
  });

  it("retries the same answers as the same lead, and changed answers as a new one", async () => {
    const post = vi.fn().mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(refusal(503)).mockResolvedValueOnce(receipt()).mockResolvedValue(receipt(false));
    const lead = submission(post, async () => "token");
    expect(await lead.submit(forms.venue)).toMatchObject({status: "failed"});
    expect(await lead.submit(forms.venue)).toMatchObject({status: "failed"});
    expect(await lead.submit(forms.venue)).toMatchObject({status: "sent", isNew: true});
    expect(await lead.submit(forms.venue)).toMatchObject({status: "sent", isNew: false});
    await lead.submit({...forms.venue, answers: {...forms.venue.answers, nights: "Wednesdays"}});
    lead.reset();
    await lead.submit({...forms.venue, answers: {...forms.venue.answers, nights: "Wednesdays"}});
    const ids = sentBodies(post).map((body) => body.lead?.requestId);
    expect(ids).toEqual(["request000000000001", "request000000000001", "request000000000001", "request000000000001",
      "request000000000002", "request000000000003"]);
  });

  it("starts a new request id after the backend reports the submission changed", async () => {
    const post = vi.fn().mockResolvedValueOnce(refusal(409)).mockResolvedValue(receipt());
    const lead = submission(post, async () => "token");
    expect(await lead.submit(forms.story)).toEqual({status: "changed", message: messages.changed});
    expect(await lead.submit(forms.story)).toMatchObject({status: "sent"});
    expect(sentBodies(post).map((body) => body.lead?.requestId)).toEqual(["request000000000001", "request000000000002"]);
  });

  it.each([
    [400, "invalid"],
    [401, "refresh"],
    [409, "changed"],
    [429, "busy"],
    [500, "failed"],
    [503, "failed"],
  ] as const)("maps a %i to the %s state with the caller's words", async (status, problem) => {
    const post = vi.fn(async () => refusal(status));
    await expect(submission(post, async () => "token").submit(forms.referral)).resolves.toEqual({status: problem, message: messages[problem]});
  });

  it("maps a lost or unreadable answer to failed, and an invalid number to invalid_phone without sending", async () => {
    const offline = vi.fn(async () => {throw new TypeError("offline");});
    await expect(submission(offline, async () => "token").submit(forms.guide)).resolves.toEqual({status: "failed", message: messages.failed});
    const garbled = vi.fn(async () => new Response("<html>", {status: 200}));
    await expect(submission(garbled, async () => "token").submit(forms.guide)).resolves.toEqual({status: "failed", message: messages.failed});
    const unexpected = vi.fn(async () => new Response(JSON.stringify({alreadyJoined: true}), {status: 200}));
    await expect(submission(unexpected, async () => "token").submit(forms.guide)).resolves.toEqual({status: "failed", message: messages.failed});
    const never = vi.fn();
    await expect(submission(never).submit({...forms.guide, phone: "123"})).resolves.toEqual({status: "invalid_phone", message: messages.invalid_phone});
    expect(never).not.toHaveBeenCalled();
    expect(getWebsiteAppCheckToken).not.toHaveBeenCalled();
  });
});
