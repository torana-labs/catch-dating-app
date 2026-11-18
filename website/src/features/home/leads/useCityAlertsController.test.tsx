import {act, renderHook} from "@testing-library/react";
import type {FormEvent} from "react";
import {describe, expect, it, vi} from "vitest";
import {createSiteLeadSubmission} from "../../marketing/websiteLead";
import {useCityAlertsController} from "./useCityAlertsController";

const submitEvent = () => ({preventDefault: vi.fn()}) as unknown as FormEvent<HTMLFormElement>;
const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), {status, headers: {"Content-Type": "application/json"}});
const accepted = () => reply(200, {ok: true, alreadyJoined: false, lead: {leadId: "a".repeat(64), requestKind: "city_alerts", isNew: true}});

/** The site's lead submission, posting to a stub with a fixed App Check token and numbered request ids. */
function siteSubmission(...responses: Response[]) {
  const post = vi.fn<typeof fetch>();
  for (const response of responses) post.mockResolvedValueOnce(response);
  let next = 0;
  const submission = createSiteLeadSubmission({post, appCheckToken: async () => "app-check-token",
    newRequestId: () => `request${String(++next).padStart(12, "0")}`});
  const body = (call: number) => JSON.parse(String(post.mock.calls[call][1]?.body));
  return {submission, post, body};
}

describe("useCityAlertsController", () => {
  it("sends the number as a city alerts lead for the page's city under the new-plans consent, with App Check", async () => {
    const {submission, post, body} = siteSubmission(accepted());
    const {result} = renderHook(() => useCityAlertsController({label: "Mumbai", slug: "mumbai", source: "picked"}, submission));
    act(() => result.current.setPhone("98765 43210"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe("/api/join-waitlist");
    expect(post.mock.calls[0][1]?.headers).toMatchObject({"X-Firebase-AppCheck": "app-check-token"});
    expect(body(0)).toEqual({
      requestKind: "city_alerts", city: "Mumbai", cityId: "in-mh-mumbai", countryIsoCode: "IN", citySource: "picked", website: "",
      lead: {requestId: "request000000000001", phone: "+919876543210", consent: {purpose: "cityNewPlans", version: "city-new-plans-whatsapp-v1"},
        sourcePage: "/", entry: "home-thin-week", cityAlerts: {interests: []}},
    });
    expect(result.current).toMatchObject({sent: true, submitting: false, sendProblem: null});
  });

  it("refuses a number that is not a mobile number without sending, under the field", async () => {
    const {submission, post} = siteSubmission();
    const {result} = renderHook(() => useCityAlertsController({label: "Mumbai", slug: "mumbai"}, submission));
    act(() => result.current.setPhone("98765"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(post).not.toHaveBeenCalled();
    expect(result.current.phoneProblem).toBe("Check your WhatsApp number. Include the country code if it isn’t a local number.");
    act(() => result.current.setPhone("9876543210"));
    expect(result.current.phoneProblem).toBeNull();
  });

  it("says why a send failed, and a retry with the same number is the same request", async () => {
    const {submission, post, body} = siteSubmission(reply(503), reply(429), accepted());
    const {result} = renderHook(() => useCityAlertsController({label: "Mumbai", slug: "mumbai"}, submission));
    act(() => result.current.setPhone("9876543210"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current).toMatchObject({sent: false, sendProblem: "That didn’t go through. Check your connection and try again."});
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current.sendProblem).toBe("We’ve had a lot of requests from you in the last hour. Please try again later.");
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(post).toHaveBeenCalledTimes(3);
    expect(new Set([0, 1, 2].map((call) => body(call).lead.requestId))).toEqual(new Set(["request000000000001"]));
    expect(result.current).toMatchObject({sent: true, sendProblem: null});
  });
});
