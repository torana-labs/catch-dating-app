import {act, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";
import {walkthroughBookingCopy as copy} from "@content/walkthroughBooking";
import walkthroughPage from "@content/playbook/pages/host/walkthrough.json";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import {scriptedWalkthroughClient, walkthroughFixturePhone, walkthroughRefusal} from "../../stories/fixtures/walkthroughBooking";
import {provideWalkthroughDeps, type WalkthroughDeps} from "./walkthroughClientContext";
import {useWalkthroughBookingController, walkthroughFieldsOf} from "./useWalkthroughBookingController";

vi.mock("../../firebase", () => ({}));

const form = walkthroughPage.sections.flatMap((section) => "leadForm" in section && section.leadForm ? [section.leadForm as PlaybookLeadForm] : [])[0]!;

function renderController(deps: WalkthroughDeps, which: PlaybookLeadForm = form) {
  return renderHook(() => useWalkthroughBookingController(which), {
    wrapper: ({children}: {children: ReactNode}) => <>{provideWalkthroughDeps(deps, children)}</>,
  });
}

async function readyToBook(result: ReturnType<typeof renderController>["result"]) {
  await waitFor(() => expect(result.current.stage.name).toBe("pick"));
  act(() => result.current.pickSlot("2026-11-23T05:00:00.000Z"));
  act(() => result.current.continueToDetails());
  act(() => {
    result.current.setAnswer("name")("  Asha   Rivera ");
    result.current.setAnswer("orgName")("Harbour Lane Studio");
    result.current.setAnswer("whatYouHost")("Pottery evenings");
  });
}

describe("walkthrough booking controller", () => {
  it("asks the page form's name, organisation and what you run, never its preferred time", () => {
    expect(walkthroughFieldsOf(form).map((field) => field.name)).toEqual(["name", "orgName", "whatYouHost"]);
    expect(walkthroughFieldsOf({...form, fields: [{name: "whatYouHost", label: "What you run"}]}).map((field) => field.name))
      .toEqual(["name", "whatYouHost"]);
  });

  it("opens the sign-in sheet for a signed-out visitor, then books once the number is confirmed", async () => {
    const scripted = scriptedWalkthroughClient({caller: null});
    const {result} = renderController({client: scripted.client, timeZone: null});
    await readyToBook(result);
    await act(() => result.current.submitDetails());
    expect(result.current.signIn).toBe(true);
    expect(scripted.calls.book).toHaveLength(0);
    scripted.signIn();
    await act(() => result.current.signedIn());
    expect(result.current.stage.name).toBe("done");
    expect(scripted.calls.book[0]).toMatchObject({name: "Asha Rivera", slotStartAt: "2026-11-23T05:00:00.000Z"});
    const stage = result.current.stage;
    expect(stage.name === "done" && stage.phone).toBe(walkthroughFixturePhone);
  });

  it("starts a fresh request once when the server says the request changed", async () => {
    const scripted = scriptedWalkthroughClient({book: [walkthroughRefusal("already-exists", "request_changed"), () => {
      throw walkthroughRefusal("unavailable");
    }]});
    const {result} = renderController({client: scripted.client, timeZone: null});
    await readyToBook(result);
    await act(() => result.current.submitDetails());
    expect(scripted.calls.book).toHaveLength(2);
    expect(scripted.calls.book[1].requestId).not.toBe(scripted.calls.book[0].requestId);
    expect(result.current.problem?.problem).toBe("offline");
  });

  it("asks for the code again when the server does not see a verified number", async () => {
    const scripted = scriptedWalkthroughClient({book: [walkthroughRefusal("failed-precondition", "phone_unverified")]});
    const {result} = renderController({client: scripted.client, timeZone: null});
    await readyToBook(result);
    await act(() => result.current.submitDetails());
    expect(result.current.signIn).toBe(true);
    expect(result.current.problem?.problem).toBe("phone");
    expect(copy.problems.phone).toBeTruthy();
  });
});
