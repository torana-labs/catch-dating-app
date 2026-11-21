import {act, renderHook} from "@testing-library/react";
import type {FormEvent} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {createWebsiteLeadSubmission, type WebsiteLeadOutcome, type WebsiteLeadSubmission} from "../../shared/api/websiteLead";
import {useCityAlertsController} from "./useCityAlertsController";

const trackWebsiteLeadFormEvent = vi.hoisted(() => vi.fn());
vi.mock("../../analytics", async (original) => ({...await original<typeof import("../../analytics")>(), trackMarketingEvent: vi.fn(), trackWebsiteLeadFormEvent}));
vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));
afterEach(() => {
  vi.unstubAllGlobals();
  trackWebsiteLeadFormEvent.mockReset();
});

const place = {citySlug: "mumbai", cityLabel: "Mumbai", sourcePage: "/mumbai/", entry: "ex-wa"};
const submitEvent = () => ({preventDefault: vi.fn()}) as unknown as FormEvent<HTMLFormElement>;
const receipt = {ok: true as const, alreadyJoined: false, lead: {leadId: "f".repeat(64), requestKind: "city_alerts" as const, isNew: true}};
const stub = (outcome: WebsiteLeadOutcome) => {
  const submission: WebsiteLeadSubmission = {submit: vi.fn(async () => outcome), reset: vi.fn()};
  return submission;
};

describe("useCityAlertsController", () => {
  it("sends the page's city_alerts form and says a person replies", async () => {
    const submission = stub({status: "sent", leadId: "f".repeat(64), isNew: true});
    const {result} = renderHook(() => useCityAlertsController(place, ["runs"], () => submission));
    act(() => result.current.setPhone("98000 00000"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(submission.submit).toHaveBeenCalledWith(expect.objectContaining({
      kind: "city_alerts", phone: "98000 00000", city: "Mumbai", entry: "ex-wa", sourcePage: "/mumbai/", answers: {interests: ["runs"]}}));
    expect(result.current.sent).toBe(true);
  });

  it("records the form's viewed and started events once each, by its kind and entry, never the number or city", async () => {
    vi.mocked(trackWebsiteLeadFormEvent).mockReturnValue(true);
    const submission = stub({status: "sent", leadId: "f".repeat(64), isNew: true});
    const {result, rerender} = renderHook(() => useCityAlertsController(place, ["runs"], () => submission));
    act(() => result.current.setPhone("98000"));
    act(() => result.current.setPhone("98000 00000"));
    rerender();
    expect(vi.mocked(trackWebsiteLeadFormEvent).mock.calls).toEqual([
      ["viewed", {kind: "city_alerts", formId: "ex-wa"}],
      ["started", {kind: "city_alerts", formId: "ex-wa"}],
    ]);
  });

  it("shows the lead client's words for a failure and clears them when the number changes", async () => {
    const submission = stub({status: "invalid_phone", message: "Check your WhatsApp number."});
    const {result} = renderHook(() => useCityAlertsController(place, [], () => submission));
    act(() => result.current.setPhone("12"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current.error).toBe("Check your WhatsApp number.");
    expect(result.current.sent).toBe(false);
    act(() => result.current.setPhone("123"));
    expect(result.current.error).toBeNull();
  });

  it("sends the site's App Check token through the site's lead client by default", async () => {
    const post = vi.fn(async () => new Response(JSON.stringify(receipt), {status: 200}));
    vi.stubGlobal("fetch", post);
    const {result} = renderHook(() => useCityAlertsController(place, ["runs"]));
    act(() => result.current.setPhone("9800000000"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(post).toHaveBeenCalledWith("/api/join-waitlist", expect.objectContaining({
      headers: {"Content-Type": "application/json", "X-Firebase-AppCheck": "site-token"}}));
    const body = JSON.parse(String((post.mock.calls[0] as unknown as [string, {body: string}])[1].body));
    expect(body).toMatchObject({requestKind: "city_alerts", city: "Mumbai",
      lead: {phone: "+919800000000", sourcePage: "/mumbai/", entry: "ex-wa", cityAlerts: {interests: ["runs"]}}});
    expect(result.current.sent).toBe(true);
  });

  it("keeps one submission for the form's life, so a retry is the same lead", async () => {
    const post = vi.fn().mockResolvedValueOnce(new Response("{}", {status: 503})).mockResolvedValue(new Response(JSON.stringify(receipt), {status: 200}));
    const makeSubmission = vi.fn(() => createWebsiteLeadSubmission({messages: {invalid_phone: "a", invalid: "b", refresh: "c", changed: "d", busy: "e", failed: "f"},
      phoneCountry: "IN", appCheckToken: async () => null, post}));
    const {result, rerender} = renderHook(() => useCityAlertsController(place, [], makeSubmission));
    act(() => result.current.setPhone("9800000000"));
    await act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current.error).toBe("f");
    rerender();
    await act(() => result.current.handleSubmit(submitEvent()));
    const [first, second] = post.mock.calls.map(([, init]) => JSON.parse(String((init as {body: string}).body)).lead.requestId);
    expect(second).toBe(first);
    expect(makeSubmission).toHaveBeenCalledTimes(1);
  });
});
