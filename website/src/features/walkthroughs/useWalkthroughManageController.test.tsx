import {act, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";
import {walkthroughBookingCopy as copy} from "@content/walkthroughBooking";
import {
  scriptedWalkthroughClient,
  walkthroughFixtureBookingId,
  walkthroughManagedFor,
  walkthroughRefusal,
} from "../../stories/fixtures/walkthroughBooking";
import {provideWalkthroughDeps, type WalkthroughDeps} from "./walkthroughClientContext";
import {useWalkthroughManageController} from "./useWalkthroughManageController";

vi.mock("../../firebase", () => ({}));

function renderController(deps: WalkthroughDeps, link: {search: string; hash: string}) {
  return renderHook(() => useWalkthroughManageController(link), {
    wrapper: ({children}: {children: ReactNode}) => <>{provideWalkthroughDeps(deps, children)}</>,
  });
}

describe("walkthrough manage controller", () => {
  it("reads again as the signed-in booker after the number is confirmed", async () => {
    let signedIn = false;
    const scripted = scriptedWalkthroughClient({manage: [() => signedIn ? walkthroughManagedFor() : walkthroughRefusal("permission-denied", "not_yours")]});
    const {result} = renderController({client: scripted.client, timeZone: null}, {search: `?booking=${walkthroughFixtureBookingId}`, hash: ""});
    await waitFor(() => expect(result.current.stage.name).toBe("signIn"));
    act(() => result.current.openSignIn());
    expect(result.current.signIn).toBe(true);
    signedIn = true;
    act(() => result.current.signedIn());
    await waitFor(() => expect(result.current.stage.name).toBe("ready"));
    expect(result.current.signIn).toBe(false);
    expect(scripted.calls.manage.every((call) => !("manageToken" in call))).toBe(true);
  });

  it("asks for a time before moving and trims the cancel reason to the contract's length", async () => {
    const scripted = scriptedWalkthroughClient();
    const {result} = renderController({client: scripted.client, timeZone: null},
      {search: `?booking=${walkthroughFixtureBookingId}`, hash: `#t=${"T".repeat(43)}`});
    await waitFor(() => expect(result.current.stage.name).toBe("ready"));
    act(() => result.current.startMove());
    act(() => result.current.confirmMove());
    expect(result.current.notice).toBe(copy.pickTime);
    act(() => result.current.back());
    act(() => result.current.startCancel());
    act(() => result.current.setReason(`  ${"x".repeat(320)}  `));
    act(() => result.current.confirmCancel());
    await waitFor(() => expect(scripted.calls.manage.at(-1)?.action).toBe("cancel"));
    expect(scripted.calls.manage.at(-1)?.reason).toHaveLength(300);
  });
});
