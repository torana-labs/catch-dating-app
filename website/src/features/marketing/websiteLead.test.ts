import {websiteLeadCopy} from "@content/websiteLead";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {setMarketingConsent} from "../../analytics";
import {websiteLeadProblems} from "../../shared/api/websiteLead";
import {createSiteLeadSubmission} from "./websiteLead";

vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token"),
  getWebsiteReferrerIdToken: vi.fn(async () => null)}));

beforeEach(() => {
  localStorage.clear();
  window.dataLayer = [];
  window.history.replaceState(null, "", "/run-clubs/?utm_source=ig#form");
});
afterEach(() => window.history.replaceState(null, "", "/"));

const leadFormEvents = () => (window.dataLayer ?? []).filter((entry) => !Array.isArray(entry) && String(entry.event).startsWith("lead_form_"));
const accepted = () => new Response(JSON.stringify({ok: true, alreadyJoined: false,
  lead: {leadId: "f".repeat(64), requestKind: "guide", isNew: true}}), {status: 200});

const form = {kind: "guide", phone: "98123 45678", consentVersion: "lead-2026-11", sourcePage: "/run-clubs/",
  entry: "rc-wa", answers: {format: "run_club"}} as const;

describe("createSiteLeadSubmission", () => {
  it("words every failure state from the content layer", () => {
    for (const problem of websiteLeadProblems) expect(websiteLeadCopy.problems[problem]).toMatch(/\S/u);
    expect(Object.keys(websiteLeadCopy.problems).sort()).toEqual([...websiteLeadProblems].sort());
  });

  it("sends with the market's dialling code and the site's App Check token, and words a refusal", async () => {
    const post = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error: "Please refresh the page and try again."}), {status: 401}))
      .mockResolvedValueOnce(new Response(JSON.stringify({ok: true, alreadyJoined: false,
        lead: {leadId: "f".repeat(64), requestKind: "guide", isNew: true}}), {status: 200}));
    const lead = createSiteLeadSubmission({post: post as unknown as typeof fetch});
    await expect(lead.submit(form)).resolves.toEqual({status: "refresh", message: websiteLeadCopy.problems.refresh});
    await expect(lead.submit(form)).resolves.toMatchObject({status: "sent"});
    const [, init] = post.mock.calls[1] as [string, RequestInit];
    expect(init.headers).toEqual({"Content-Type": "application/json", "X-Firebase-AppCheck": "site-token"});
    expect(JSON.parse(String(init.body))).toMatchObject({requestKind: "guide", lead: {phone: "+919812345678"}});
  });

  it("records submitted, then succeeded or failed with the problem, after analytics consent and never an answer or number", async () => {
    setMarketingConsent("analytics");
    window.dataLayer = [];
    const post = vi.fn().mockResolvedValueOnce(new Response("{}", {status: 429})).mockResolvedValueOnce(accepted());
    const lead = createSiteLeadSubmission({post: post as unknown as typeof fetch});
    await lead.submit(form);
    await lead.submit(form);
    await lead.submit({...form, phone: "12"});
    const page = {content_version: "website_copy_v2", lead_kind: "guide", form_id: "rc-wa", page_path: "/run-clubs/"};
    expect(leadFormEvents()).toEqual([
      {event: "lead_form_submitted", ...page},
      {event: "lead_form_failed", ...page, problem: "busy"},
      {event: "lead_form_submitted", ...page},
      {event: "lead_form_succeeded", ...page},
      {event: "lead_form_submitted", ...page},
      {event: "lead_form_failed", ...page, problem: "invalid_phone"},
    ]);
    expect(JSON.stringify(window.dataLayer)).not.toMatch(/98123|45678|run_club|request/u);
  });

  it("records nothing without analytics consent, and still sends", async () => {
    const post = vi.fn(async () => accepted());
    await expect(createSiteLeadSubmission({post: post as unknown as typeof fetch}).submit(form)).resolves.toMatchObject({status: "sent"});
    setMarketingConsent("essential");
    await expect(createSiteLeadSubmission({post: post as unknown as typeof fetch}).submit(form)).resolves.toMatchObject({status: "sent"});
    expect(post).toHaveBeenCalledTimes(2);
    expect(leadFormEvents()).toEqual([]);
  });
});
