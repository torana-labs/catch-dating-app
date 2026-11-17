import {act, renderHook} from "@testing-library/react";
import type {FormEvent} from "react";
import {describe, expect, it, vi} from "vitest";
import {createSiteLeadSubmission} from "../../marketing/websiteLead";
import {useHostReferralController, type HostReferralField} from "./useHostReferralController";

const submitEvent = () => ({preventDefault: vi.fn()}) as unknown as FormEvent<HTMLFormElement>;
const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), {status, headers: {"Content-Type": "application/json"}});
const accepted = () => reply(200, {ok: true, alreadyJoined: false, lead: {leadId: "b".repeat(64), requestKind: "referral", isNew: true}});
const fields: readonly HostReferralField[] = ["fullName", "phone", "hostName", "hostLink", "relationship"];

function siteSubmission(...responses: Response[]) {
  const post = vi.fn<typeof fetch>();
  for (const response of responses) post.mockResolvedValueOnce(response);
  let next = 0;
  const submission = createSiteLeadSubmission({post, appCheckToken: async () => "app-check-token",
    newRequestId: () => `request${String(++next).padStart(12, "0")}`});
  const body = (call: number) => JSON.parse(String(post.mock.calls[call][1]?.body));
  return {submission, post, body};
}

type Referral = ReturnType<typeof useHostReferralController>;
function fill(referral: Referral, answers: Partial<Record<HostReferralField, string>>) {
  act(() => {
    for (const [field, value] of Object.entries(answers)) referral.set(field as HostReferralField)(value);
  });
}
const complete = {fullName: "  Asha  Rao ", phone: "98765 43210", hostName: " Lantern Lane Social ", hostLink: "@lanternlanesocial",
  relationship: "I go to their supper club"};

describe("useHostReferralController", () => {
  it("checks every field before sending, and clears a field's words when it is edited", async () => {
    const {submission, post} = siteSubmission();
    const {result} = renderHook(() => useHostReferralController({label: "Mumbai", slug: "mumbai"}, submission));
    fill(result.current, {fullName: "A", phone: "98765"});
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(post).not.toHaveBeenCalled();
    expect(Object.fromEntries(fields.map((field) => [field, result.current.problem(field)]))).toEqual({
      fullName: "Enter your name.",
      phone: "Check your WhatsApp number. Include the country code if it isn’t a local number.",
      hostName: "Enter the host or club’s name.",
      hostLink: "Add their Instagram handle or website.",
      relationship: "Say how you know them.",
    });
    fill(result.current, {hostName: "Lantern Lane Social"});
    expect(result.current.problem("hostName")).toBeNull();
    expect(result.current.problem("hostLink")).toBe("Add their Instagram handle or website.");
  });

  it("sends a referral lead with the person's name, the host's details and the page's city, under the follow-up consent", async () => {
    const {submission, post, body} = siteSubmission(accepted());
    const {result} = renderHook(() => useHostReferralController({label: "Mumbai", slug: "mumbai", source: "network_guess"}, submission));
    fill(result.current, complete);
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(post.mock.calls[0][1]?.headers).toMatchObject({"X-Firebase-AppCheck": "app-check-token"});
    expect(body(0)).toEqual({
      requestKind: "referral", fullName: "Asha Rao", city: "Mumbai", cityId: "in-mh-mumbai", countryIsoCode: "IN", citySource: "network_guess", website: "",
      lead: {requestId: "request000000000001", phone: "+919876543210", consent: {purpose: "leadFollowUp", version: "host-referral-whatsapp-v1"},
        sourcePage: "/", entry: "home-refer",
        referral: {hostName: "Lantern Lane Social", hostLink: "@lanternlanesocial", relationship: "I go to their supper club"}},
    });
    expect(result.current).toMatchObject({sent: true, sendProblem: null,
      sentMessage: "Thanks for introducing Lantern Lane Social. We’ll message you on WhatsApp about it."});
  });

  it("retries a failed send as the same request, and changed answers as a new one", async () => {
    const {submission, post, body} = siteSubmission(reply(500), reply(401), accepted());
    const {result} = renderHook(() => useHostReferralController({label: "Mumbai", slug: "mumbai"}, submission));
    fill(result.current, complete);
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current).toMatchObject({sent: false, submitting: false, sendProblem: "That didn’t go through. Check your connection and try again."});
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current.sendProblem).toBe("We couldn’t confirm this page. Refresh it, then send the form again.");
    expect(body(1).lead.requestId).toBe(body(0).lead.requestId);
    // Editing an answer clears the failure, and the edited request gets its own id.
    fill(result.current, {relationship: "A friend runs it"});
    expect(result.current.sendProblem).toBeNull();
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(post).toHaveBeenCalledTimes(3);
    expect(body(2).lead.requestId).toBe("request000000000002");
    expect(body(2).lead.referral.relationship).toBe("A friend runs it");
    expect(result.current.sent).toBe(true);
  });
});
