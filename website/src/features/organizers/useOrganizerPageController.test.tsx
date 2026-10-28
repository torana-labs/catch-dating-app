import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {claimedOrganizerPage, generatedOrganizerPage, organizerPageReadAt, organizerStoryListing} from "../../stories/fixtures/organizerPages";
import type {OrganizerPageRecord} from "./organizerPage";

const accountApi = vi.hoisted(() => ({watch: vi.fn(), read: vi.fn(), follow: vi.fn()}));
const trackMarketingEvent = vi.hoisted(() => vi.fn());
const trackOrganizerAnalytics = vi.hoisted(() => vi.fn());
vi.mock("../../firebase", async (original) => ({...await original<object>(), watchWebsiteAccountAuthState: accountApi.watch,
  manageWebsiteAccount: accountApi.read, setWebsiteOrganizerFollow: accountApi.follow}));
vi.mock("../../analytics", () => ({trackMarketingEvent, getMarketingConsent: () => null, marketingConsentChangedEvent: "catch:marketing-consent-changed"}));
vi.mock("./analytics", () => ({trackOrganizerAnalytics, observeOrganizerPageView: vi.fn(() => () => undefined)}));
vi.mock("./observeOrganizerProviders", () => ({observeOrganizerProviders: vi.fn(() => () => undefined)}));

import {useOrganizerPageController, type OrganizerPageBackends} from "./useOrganizerPageController";

// One client per test, cleared after it: no account read, mutation or cache
// timer may outlive the test and render after jsdom is torn down.
let queryClient: QueryClient;
const wrapper = ({children}: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

function renderController(page: OrganizerPageRecord = claimedOrganizerPage, backends?: OrganizerPageBackends) {
  const listing = organizerStoryListing(page);
  return {listing, ...renderHook(() => useOrganizerPageController({backends, listing, page, readAt: organizerPageReadAt}), {wrapper})};
}

describe("useOrganizerPageController", () => {
  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  beforeEach(() => {
    queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    vi.clearAllMocks();
    accountApi.watch.mockImplementation((callback) => {callback({uid: "one", phoneNumber: "+919876543210"}); return vi.fn();});
    accountApi.read.mockResolvedValue({uid: "one", accountReady: true, following: false, displayName: "Ada", profileRevision: 1, eventAge: null});
    accountApi.follow.mockImplementation(async (_id, following) => {
      accountApi.read.mockResolvedValue({uid: "one", accountReady: true, following, displayName: "Ada", profileRevision: 1, eventAge: null});
      return {following};
    });
  });

  it("is a guest's page, worked out from the record at the read time", () => {
    const {result} = renderController();
    expect(result.current.role).toBe("guest");
    expect(result.current.view.nextUp?.label).toBe("Next up · in 2 days");
    expect(result.current.share.url).toBe("https://catchdates.com/organizers/lantern-lane-runners/");
    expect(result.current.share.displayUrl).toBe("catchdates.com/organizers/lantern-lane-runners");
  });

  it("follows through the visitor's account until follow by phone lands, and records the save", async () => {
    const {listing, result} = renderController();
    expect(result.current.follow.phone).toBeNull();
    await waitFor(() => expect(accountApi.read).toHaveBeenCalled());
    await waitFor(() => expect(result.current.follow.pending).toBe(false));
    act(() => result.current.follow.press());
    await waitFor(() => expect(result.current.follow.following).toBe(true));
    expect(accountApi.follow).toHaveBeenCalledWith(listing.id, true, "one");
    expect(trackOrganizerAnalytics).toHaveBeenCalledWith(listing, "organizerSave", "organizer_page");
    act(() => result.current.follow.press());
    await waitFor(() => expect(result.current.follow.following).toBe(false));
  });

  it("keeps the follow unchanged and says so when it fails", async () => {
    accountApi.follow.mockRejectedValueOnce(new Error("unavailable"));
    const {result} = renderController();
    await waitFor(() => expect(accountApi.read).toHaveBeenCalled());
    await waitFor(() => expect(result.current.follow.pending).toBe(false));
    act(() => result.current.follow.press());
    await waitFor(() => expect(result.current.follow.error).not.toBe(""));
    expect(result.current.follow.following).toBe(false);
  });

  it("resumes the requested follow after account completion", async () => {
    accountApi.read.mockResolvedValue({uid: "one", accountReady: false, following: false, displayName: "", profileRevision: 0, eventAge: null});
    const {result} = renderController();
    await waitFor(() => expect(accountApi.read).toHaveBeenCalled());
    await waitFor(() => expect(result.current.follow.pending).toBe(false));
    act(() => result.current.follow.press());
    expect(accountApi.follow).not.toHaveBeenCalled();
    accountApi.read.mockResolvedValue({uid: "one", accountReady: true, following: false, displayName: "Ada", profileRevision: 1, eventAge: null});
    await act(async () => {await result.current.follow.account?.refresh();});
    await waitFor(() => expect(result.current.follow.following).toBe(true));
    expect(accountApi.follow).toHaveBeenCalledTimes(1);
  });

  it("reads an existing follow on a new page mount", async () => {
    accountApi.read.mockResolvedValue({uid: "one", accountReady: true, following: true, displayName: "Ada", profileRevision: 1, eventAge: null});
    const {result} = renderController();
    await waitFor(() => expect(result.current.follow.following).toBe(true));
    expect(accountApi.follow).not.toHaveBeenCalled();
  });

  it("follows by phone through its backend once one is provided", async () => {
    const backends: OrganizerPageBackends = {followByPhone: {sendCode: vi.fn(async () => undefined), confirm: vi.fn(async () => undefined)},
      submitReview: null};
    const {listing, result} = renderController(claimedOrganizerPage, backends);
    act(() => result.current.follow.press());
    expect(result.current.follow.phone?.step).toBe("phone");
    act(() => result.current.follow.phone!.sendCode());
    expect(result.current.follow.error).toBe("Enter a 10-digit mobile number");
    act(() => result.current.follow.phone!.setNumber("98765 43210"));
    await act(async () => result.current.follow.phone!.sendCode());
    expect(backends.followByPhone!.sendCode).toHaveBeenCalledWith({organizerId: listing.id, phoneNumber: "+919876543210"});
    expect(result.current.follow.phone).toMatchObject({step: "code", shown: "+91 98765 43210"});
    act(() => result.current.follow.phone!.setCode("12a34"));
    act(() => result.current.follow.phone!.confirm());
    expect(result.current.follow.error).toBe("Enter the 6-digit code");
    act(() => result.current.follow.phone!.setCode("123456"));
    await act(async () => result.current.follow.phone!.confirm());
    expect(backends.followByPhone!.confirm).toHaveBeenCalledWith({organizerId: listing.id, phoneNumber: "+919876543210", code: "123456"});
    expect(result.current.follow).toMatchObject({following: true, phone: {step: "done"}});
    expect(accountApi.follow).not.toHaveBeenCalled();
  });

  it("opens the share card and copies the page link", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {configurable: true, value: {writeText}});
    const {listing, result} = renderController();
    act(() => result.current.share.toggle());
    expect(result.current.share.open).toBe(true);
    await act(async () => result.current.share.copy());
    expect(writeText).toHaveBeenCalledWith("https://catchdates.com/organizers/lantern-lane-runners/");
    expect(result.current.share.copyState).toBe("copied");
    expect(trackMarketingEvent).toHaveBeenCalledWith("listing_share_completed", {club_id: listing.id, method: "clipboard"});
    writeText.mockRejectedValueOnce(new Error("denied"));
    await act(async () => result.current.share.copy());
    expect(result.current.share.copyState).toBe("failed");
  });

  it("hides the review form until review submission lands, then checks a review before posting it", async () => {
    expect(renderController(generatedOrganizerPage).result.current.review).toBeNull();
    const submitReview = vi.fn(async () => undefined);
    const {listing, result} = renderController(generatedOrganizerPage, {followByPhone: null, submitReview});
    act(() => result.current.review!.submit());
    expect(result.current.review!.error).toBe("Choose a star rating");
    act(() => result.current.review!.setStars(5));
    act(() => result.current.review!.setText("Too short"));
    act(() => result.current.review!.submit());
    expect(result.current.review!.error).toBe("Write at least 20 characters");
    act(() => result.current.review!.setText("A friendly crowd and a well paced loop."));
    act(() => result.current.review!.submit());
    expect(result.current.review!.error).toBe("Add your first name");
    act(() => result.current.review!.setName(" Asha "));
    await act(async () => result.current.review!.submit());
    expect(submitReview).toHaveBeenCalledWith({organizerId: listing.id, rating: 5,
      comment: "A friendly crowd and a well paced loop.", reviewerName: "Asha"});
    expect(result.current.review!.done).toBe(true);
  });

  it("sends link, event and claim clicks as organiser analytics", () => {
    const {listing, result} = renderController(generatedOrganizerPage);
    const {view} = result.current;
    result.current.openLink(view.links[1]);
    expect(trackOrganizerAnalytics).toHaveBeenLastCalledWith(listing, "contactClick", "source_socialProfile");
    result.current.openEvent(view.events.rows[0]);
    expect(trackOrganizerAnalytics).toHaveBeenLastCalledWith(listing, "outboundClick", "external_event_booking", "harbour-sun-1");
    result.current.openClaim();
    expect(trackOrganizerAnalytics).toHaveBeenLastCalledWith(listing, "claimClick", "claim_unlocks_panel");
    const claimed = renderController().result.current;
    claimed.openEvent(claimed.view.events.rows[0]);
    expect(trackOrganizerAnalytics).toHaveBeenLastCalledWith(expect.anything(), "outboundClick", "catch_event_card", "lantern-sun-1");
  });
});
