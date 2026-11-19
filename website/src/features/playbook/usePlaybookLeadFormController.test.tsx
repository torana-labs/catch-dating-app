import {act, renderHook} from "@testing-library/react";
import type {FormEvent} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {websiteLeadCopy} from "@content/websiteLead";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import {setMarketingConsent} from "../../analytics";
import {createWebsiteLeadSubmission} from "../../shared/api/websiteLead";
import {usePlaybookLeadFormController} from "./usePlaybookLeadFormController";

const venue: PlaybookLeadForm = {id: "venue_list_space", requestKind: "venue", label: "Number", submitLabel: "List my space", fields: [
  {name: "orgName", label: "Venue"}, {name: "capacity", label: "Fit"}, {name: "nights", label: "Nights"},
]};
const guide: PlaybookLeadForm = {id: "run_club_setup_guide", requestKind: "guide", format: "run-clubs", label: "Number", submitLabel: "Send the guide"};
const referral: PlaybookLeadForm = {id: "referral_host", requestKind: "referral", label: "Number", submitLabel: "Send referral", fields: [
  {name: "name", label: "Your name"}, {name: "hostName", label: "Host"}, {name: "hostLink", label: "Link"}, {name: "relationship", label: "How"},
]};

const accepted = () => new Response(JSON.stringify({ok: true, alreadyJoined: false, lead: {leadId: "0".repeat(64), requestKind: "guide", isNew: true}}), {status: 200});
const unavailable = () => new Response(JSON.stringify({error: "Unavailable"}), {status: 503});

/**
 * A real lead client whose posts the test answers, with numbered request ids.
 * `referrerIdToken` stands in for the signed-in account's Firebase ID token
 * (null when signed out), which the client reads only for a referral.
 */
function leadClientWith(referrerIdToken: () => Promise<string | null>, ...answers: (() => Response | Promise<Response>)[]) {
  const post = vi.fn<typeof fetch>();
  for (const answer of answers) post.mockImplementationOnce(async () => answer());
  let id = 0;
  const submission = createWebsiteLeadSubmission({
    messages: websiteLeadCopy.problems, phoneCountry: "IN", post, appCheckToken: async () => "token", referrerIdToken,
    newRequestId: () => `request${String(++id).padStart(12, "0")}`,
  });
  const bodies = () => post.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as {requestKind: string; lead: Record<string, unknown>});
  const headers = () => post.mock.calls.map(([, init]) => init?.headers as Record<string, string>);
  return {submission, post, bodies, headers};
}
const leadClient = (...answers: (() => Response | Promise<Response>)[]) => leadClientWith(async () => null, ...answers);

const submitEvent = () => ({preventDefault: vi.fn()}) as unknown as FormEvent<HTMLFormElement>;

afterEach(() => {
  localStorage.clear();
  window.dataLayer = [];
});

describe("usePlaybookLeadFormController", () => {
  it("puts a line under each empty field and a short number, sends nothing, and clears a line when its field changes", async () => {
    const {submission, post} = leadClient();
    const {result} = renderHook(() => usePlaybookLeadFormController(venue, "venue", submission));
    act(() => result.current.set("phone")("98765"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(post).not.toHaveBeenCalled();
    expect(result.current.problem("orgName")).toBe(playbookCopy.leadForm.required.orgName);
    expect(result.current.problem("nights")).toBe(playbookCopy.leadForm.required.nights);
    expect(result.current.problem("phone")).toBe(websiteLeadCopy.problems.invalid_phone);
    act(() => result.current.set("orgName")("Hopline Brewing"));
    expect(result.current.problem("orgName")).toBeNull();
    expect(result.current.problem("nights")).toBe(playbookCopy.leadForm.required.nights);
  });

  it("is sending while the lead is on its way, then sent with its kind's thanks", async () => {
    let answer: (response: Response) => void = () => undefined;
    const {submission, bodies} = leadClient(() => new Promise<Response>((done) => {answer = done;}));
    const {result} = renderHook(() => usePlaybookLeadFormController(guide, "guide", submission));
    act(() => result.current.set("phone")("98765 43210"));
    let sending: Promise<void> = Promise.resolve();
    act(() => {sending = result.current.handleSubmit(submitEvent());});
    await vi.waitFor(() => expect(bodies()).toHaveLength(1));
    expect(result.current).toMatchObject({submitting: true, sent: false, submitLabel: guide.submitLabel});
    await act(async () => {
      answer(accepted());
      await sending;
    });
    expect(result.current).toMatchObject({submitting: false, sent: true, sendProblem: null, sentMessage: playbookCopy.leadForm.sent.guide});
    expect(bodies()[0]).toMatchObject({requestKind: "guide", lead: {phone: "+919876543210", entry: guide.id, guide: {format: "run_club"},
      consent: {purpose: "leadFollowUp", version: playbookCopy.leadForm.consentVersion}}});
  });

  it("words a failed send, offers to try again, and sends the retry as the same request; changed answers are a new one", async () => {
    const {submission, bodies} = leadClient(unavailable, unavailable, accepted);
    const {result} = renderHook(() => usePlaybookLeadFormController(guide, "guide", submission));
    act(() => result.current.set("phone")("98765 43210"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current).toMatchObject({sent: false, sendProblem: websiteLeadCopy.problems.failed, submitLabel: playbookCopy.leadForm.retry});
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(bodies()[1].lead.requestId).toBe(bodies()[0].lead.requestId);

    act(() => result.current.set("phone")("98765 43211"));
    expect(result.current).toMatchObject({sendProblem: null, submitLabel: guide.submitLabel});
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(bodies()[2].lead.requestId).not.toBe(bodies()[0].lead.requestId);
    expect(result.current.sent).toBe(true);
  });

  it("sends a referral with the signed-in account's ID token as its credential, and never a referrer the page chose", async () => {
    const fill = (result: {current: ReturnType<typeof usePlaybookLeadFormController>}) => act(() => {
      for (const [field, value] of [["name", "Asha Rao"], ["hostName", "Kestrel Supper Club"], ["hostLink", "kestrel.example"],
        ["relationship", "I go to their dinners"], ["phone", "98765 43210"]] as const) result.current.set(field)(value);
    });
    const signedIn = leadClientWith(async () => "id-token-asha", accepted);
    const {result} = renderHook(() => usePlaybookLeadFormController(referral, "referral", signedIn.submission));
    fill(result);
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current).toMatchObject({sent: true, sentMessage: playbookCopy.leadForm.sent.referral});
    // The intake verifies this token and records lead.referralCredit from it (functions/src/waitlist/websiteLead.ts).
    expect(signedIn.headers()[0]).toMatchObject({Authorization: "Bearer id-token-asha"});
    expect(signedIn.bodies()[0]).toMatchObject({requestKind: "referral", lead: {entry: "referral_host",
      referral: {hostName: "Kestrel Supper Club", hostLink: "kestrel.example", relationship: "I go to their dinners"}}});
    expect(Object.keys(signedIn.bodies()[0].lead).sort()).toEqual(["consent", "entry", "phone", "referral", "requestId", "sourcePage"]);
    expect(JSON.stringify(signedIn.bodies()[0])).not.toMatch(/uid|referrer|referralCredit|organizerId/iu);

    // Signed out, the same referral still sends, without a credential, so the intake records no referrer.
    const signedOut = leadClientWith(async () => null, accepted);
    const out = renderHook(() => usePlaybookLeadFormController(referral, "referral", signedOut.submission));
    fill(out.result);
    await act(() => out.result.current.handleSubmit(submitEvent()));
    expect(out.result.current.sent).toBe(true);
    expect(signedOut.headers()[0]).not.toHaveProperty("Authorization");
  });

  it("records the form as viewed after analytics consent with its lead kind and form id, and nothing without consent", () => {
    const viewed = () => (window.dataLayer ?? []).filter((entry) => !Array.isArray(entry) && entry.event === "lead_form_viewed");
    renderHook(() => usePlaybookLeadFormController(guide, "guide", leadClient().submission));
    expect(viewed()).toEqual([]);
    setMarketingConsent("analytics");
    renderHook(() => usePlaybookLeadFormController(venue, "venue", leadClient().submission));
    expect(viewed()).toEqual([{event: "lead_form_viewed", content_version: "website_copy_v2", lead_kind: "venue",
      form_id: "venue_list_space", page_path: "/"}]);
  });
});
