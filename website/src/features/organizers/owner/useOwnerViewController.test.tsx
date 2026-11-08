import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ownerViewFixture, ownerViewStoryBackends} from "../../../stories/fixtures/ownerView";
import type {OwnerViewBackends} from "./ownerViewBackends";
import type {OwnerRole} from "./ownerViewTypes";
import {ownerTabsFor, useOwnerViewController} from "./useOwnerViewController";

let queryClient: QueryClient;
const wrapper = ({children}: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

function render(options: {role?: OwnerRole; uid?: string | null; claimed?: boolean; backends?: OwnerViewBackends} = {}) {
  const backends = options.backends ?? ownerViewStoryBackends(ownerViewFixture(options.role ?? "owner"));
  return renderHook(() => useOwnerViewController({backends, claimed: options.claimed ?? true,
    initialUid: options.uid === undefined ? "owner-uid" : options.uid, organizerId: "lantern-lane-runners"}), {wrapper});
}

describe("useOwnerViewController", () => {
  beforeEach(() => {
    queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
  });
  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  it("gives each role only its tabs", () => {
    expect(ownerTabsFor(ownerViewFixture("owner").capabilities)).toEqual(["insights", "links", "page", "audience", "settings"]);
    expect(ownerTabsFor(ownerViewFixture("editor").capabilities)).toEqual(["insights", "links", "page", "audience", "settings"]);
    expect(ownerTabsFor(ownerViewFixture("analyst").capabilities)).toEqual(["insights", "settings"]);
  });

  it("shows nothing on a generated page and a sign-in line to the signed-out", () => {
    expect(render({claimed: false}).result.current.hidden).toBe(true);
    const signedOut = render({uid: null}).result.current;
    expect(signedOut.signedOut).toBe(true);
    expect(signedOut.hidden).toBe(false);
  });

  it("stays hidden for a signed-in visitor the server refuses", async () => {
    const backends = {...ownerViewStoryBackends(ownerViewFixture("owner")),
      getView: vi.fn(async () => {throw Object.assign(new Error("no"), {code: "functions/permission-denied"});})};
    const {result} = render({backends});
    await waitFor(() => expect(backends.getView).toHaveBeenCalled());
    expect(result.current.hidden).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("an editor cannot edit about or settings", async () => {
    const {result} = render({role: "editor"});
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.role).toBe("editor");
    expect(result.current.can("about")).toBe(false);
    expect(result.current.can("settings")).toBe(false);
    expect(result.current.can("photos")).toBe(true);
  });

  it("saves the edited links in one replace and moves a link", async () => {
    const view = ownerViewFixture("owner");
    const backends = {...ownerViewStoryBackends(view), manage: vi.fn(ownerViewStoryBackends(view).manage)};
    const {result} = render({backends});
    await waitFor(() => expect(result.current.data).not.toBeNull());
    act(() => result.current.links.moveDown(0));
    act(() => result.current.links.change(0, {pinned: true, label: "  Join the WhatsApp community  "}));
    expect(result.current.links.dirty).toBe(true);
    act(() => result.current.links.save());
    await waitFor(() => expect(backends.manage).toHaveBeenCalled());
    const command = backends.manage.mock.calls[0][0];
    expect(command.action).toBe("setLinks");
    if (command.action !== "setLinks") throw new Error("unexpected");
    expect(command.links.map((link) => link.id)).toEqual(["whatsapp", "night", "strava", "shop"]);
    expect(command.links[0]).toMatchObject({label: "Join the WhatsApp community", pinned: true});
    await waitFor(() => expect(result.current.notice).toMatchObject({panel: "links", text: "saved"}));
  });

  it("sends to followers on WhatsApp too when ticked, and shows both counts", async () => {
    const view = ownerViewFixture("owner");
    const backends = {...ownerViewStoryBackends(view), manage: vi.fn(ownerViewStoryBackends(view).manage)};
    const {result} = render({backends});
    await waitFor(() => expect(result.current.followers.whatsappAvailable).toBe(true));
    act(() => result.current.followers.change("New date on Saturday"));
    act(() => result.current.followers.setWhatsapp(true));
    act(() => result.current.followers.send());
    await waitFor(() => expect(result.current.followers.delivery).not.toBeNull());
    expect(backends.manage.mock.calls[0][0]).toMatchObject({action: "sendFollowerMessage", text: "New date on Saturday",
      channels: ["app", "whatsapp"]});
    expect(result.current.followers.delivery).toMatchObject({appRecipientCount: 214, whatsapp: {queuedCount: 61}});
  });

  it("keeps WhatsApp off when the organiser's number is not ready", async () => {
    const view = ownerViewFixture("owner", {whatsapp: false});
    const backends = {...ownerViewStoryBackends(view), manage: vi.fn(ownerViewStoryBackends(view).manage)};
    const {result} = render({backends});
    await waitFor(() => expect(result.current.data).not.toBeNull());
    act(() => result.current.followers.setWhatsapp(true));
    act(() => result.current.followers.change("Hello"));
    act(() => result.current.followers.send());
    await waitFor(() => expect(backends.manage).toHaveBeenCalled());
    expect(result.current.followers.whatsapp).toBe(false);
    expect("channels" in backends.manage.mock.calls[0][0]).toBe(false);
  });

  it("reports the follower allowance and a used-up month", async () => {
    const {result} = render({backends: ownerViewStoryBackends(ownerViewFixture("owner", {messagesUsed: 2}))});
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.followers.usedUp).toBe(true);
  });
});
