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

const accepted = () => new Response(JSON.stringify({ok: true, alreadyJoined: false, lead: {leadId: "0".repeat(64), requestKind: "guide", isNew: true}}), {status: 200});
const unavailable = () => new Response(JSON.stringify({error: "Unavailable"}), {status: 503});

/** A real lead client whose posts the test answers, with numbered request ids. */
function leadClient(...answers: (() => Response | Promise<Response>)[]) {
  const post = vi.fn<typeof fetch>();
  for (const answer of answers) post.mockImplementationOnce(async () => answer());
  let id = 0;
  const submission = createWebsiteLeadSubmission({
    messages: websiteLeadCopy.problems, dialCode: "+91", post, appCheckToken: async () => "token",
    newRequestId: () => `request${String(++id).padStart(12, "0")}`,
  });
  const bodies = () => post.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as {requestKind: string; lead: Record<string, unknown>});
  return {submission, post, bodies};
}

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
