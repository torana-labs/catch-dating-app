import {websiteLeadCopy} from "@content/websiteLead";
import {describe, expect, it, vi} from "vitest";
import {websiteLeadProblems} from "../../shared/api/websiteLead";
import {createSiteLeadSubmission} from "./websiteLead";

vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));

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
});
