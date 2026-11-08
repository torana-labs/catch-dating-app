import {describe, expect, it} from "vitest";
import {isJoinWaitlistHttpRequest} from "../../shared/api/joinWaitlistContract";
import {initialStepTwoDraft, type WeddingsApplication} from "./weddingsModel";
import {createWeddingsSubmit, weddingsApplicationRequest, weddingsPhone} from "./weddingsSubmit";

const application: WeddingsApplication = {
  name: " Meher Shah ", company: "Meher Shah Weddings", phone: "98201 44718", date: "2026-12-12",
  destination: "Udaipur", guests: "150 to 400", tools: ["Spreadsheets"], ...initialStepTwoDraft, lastTime: "",
};

function respond(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {status, headers: {"Content-Type": "application/json"}}));
}

describe("weddings submit", () => {
  it("builds a phone-only Host application with the programme answers", () => {
    expect(weddingsPhone("98201 44718")).toBe("+919820144718");
    const request = weddingsApplicationRequest(application);
    expect(request).toMatchObject({fullName: "Meher Shah", phone: "+919820144718", role: "host", programme: "weddings"});
    expect(request.programmeApplication).toMatchObject({planningCompany: "Meher Shah Weddings", weddingDate: "2026-12-12",
      functions: initialStepTwoDraft.functions, teamSize: initialStepTwoDraft.team});
    expect(request.programmeApplication).not.toHaveProperty("freeText");
    expect("email" in request).toBe(false);
    expect(isJoinWaitlistHttpRequest({...request, analytics: {consent: null, eventId: "weddings_lead_1", formVariant: "host",
      pagePath: "/weddings/apply/", pageTitle: "Catch", submittedAt: "2026-11-08T08:05:00.000Z"}})).toBe(true);
  });

  it("posts to the waitlist route, keeps one request id across retries and surfaces the server's error", async () => {
    const bodies: Array<{analytics: {eventId: string}}> = [];
    let fail = true;
    const submit = createWeddingsSubmit(((_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      if (fail) {
        fail = false;
        return respond(429, {error: "Too many requests. Please try again later."});
      }
      return respond(200, {ok: true, alreadyJoined: false});
    }) as typeof fetch);
    await expect(submit(application)).rejects.toThrow("Too many requests");
    await submit(application);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].analytics.eventId).toBe(bodies[1].analytics.eventId);
  });
});
