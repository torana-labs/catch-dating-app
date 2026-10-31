import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";

const runtime = vi.hoisted(() => ({user: null as null | {uid: string}}));
const getEventRuntimeBootstrap = vi.hoisted(() => vi.fn());
const getEventSuccessConversationGraph = vi.hoisted(() => vi.fn());
const submitEventSuccessConversationGraph = vi.hoisted(() => vi.fn());
const checkInEventRuntime = vi.hoisted(() => vi.fn());
const heartbeatEventRuntimePresence = vi.hoisted(() => vi.fn());
const createEventRuntimeAttendeeInviteLink = vi.hoisted(() => vi.fn());
const recordEventRuntimeShareIntent = vi.hoisted(() => vi.fn());
const watchEventRuntimeAuthState = vi.hoisted(() => vi.fn(
  (callback: (user: typeof runtime.user) => void) => {
    callback(runtime.user);
    return vi.fn();
  }
));
const watchEventRuntimeLiveState = vi.hoisted(() => vi.fn(async () => vi.fn()));

vi.mock("../../firebase", () => ({
  beginPublicEventPhoneVerification: vi.fn(),
  checkInEventRuntime,
  claimEventRuntimeAccess: vi.fn(),
  completeEventRuntimeFirstHello: vi.fn(),
  createEventRuntimeAttendeeInviteLink,
  fetchEventRuntimeWingmanCandidates: vi.fn(),
  getEventRuntimeBootstrap,
  getEventSuccessConversationGraph,
  heartbeatEventRuntimePresence,
  recordEventInviteLinkOpen: vi.fn(),
  recordEventRuntimeShareIntent,
  saveEventRuntimeCompatibilityAnswers: vi.fn(),
  saveEventRuntimeFeedback: vi.fn(),
  startEventRuntimeFirstHello: vi.fn(),
  submitEventRuntimeProfile: vi.fn(),
  submitEventSuccessConversationGraph,
  submitEventRuntimeWingmanRequest: vi.fn(),
  watchEventRuntimeAuthState,
  watchEventRuntimeLiveState,
  withdrawEventRuntimeWingmanRequest: vi.fn(),
}));

import {useEventRuntimeController} from "./useEventRuntimeController";

function wrapper() {
  const client = new QueryClient({defaultOptions: {mutations: {retry: false}}});
  return function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function bootstrap(participant: unknown = null) {
  return {
    event: {
      eventId: "event-1",
      publicRuntimeId: "runtime_123456789012345678901234",
      title: "Courtyard Social",
      startTimeMillis: 1,
      endTimeMillis: Date.now() + 3_600_000,
      locationName: "The Courtyard",
      checkedInCount: 0,
      runtimeTermsVersion: "event-runtime-v1",
      moduleIds: [],
      requiredFieldIds: ["displayName"],
      optionalFieldIds: [],
      questionnaireConfig: null,
    },
    participant,
  };
}

describe("useEventRuntimeController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtime.user = null;
    getEventRuntimeBootstrap.mockResolvedValue(bootstrap());
    checkInEventRuntime.mockResolvedValue({
      status: "checkedIn",
      alreadyCheckedIn: false,
    });
    createEventRuntimeAttendeeInviteLink.mockResolvedValue({
      eventId: "event-1",
      inviteLinkId: "invite-1",
      inviteToken: "v2_invite-1_secret",
      label: "Attendee share",
      source: "runtime_web",
    });
    recordEventRuntimeShareIntent.mockResolvedValue({recorded: true});
    heartbeatEventRuntimePresence.mockResolvedValue({
      presenceState: "present",
      serverTimeMillis: 1,
      heartbeatIntervalSeconds: 30,
      presentWindowSeconds: 90,
      likelyDepartedAfterSeconds: 300,
    });
    getEventSuccessConversationGraph.mockResolvedValue({
      eventId: "event-1",
      consentMode: "optIn",
      prompt: "Who were your teammates?",
      candidates: [
        {uid: "guest-2", displayName: "Rhea", assigned: true},
        {uid: "guest-3", displayName: "Mina", assigned: false},
      ],
      selectedUids: [],
      submissionStatus: "unsubmitted",
    });
    submitEventSuccessConversationGraph.mockResolvedValue({
      saved: true,
      status: "submitted",
      conversationCount: 1,
    });
  });

  it("opens phone verification for an anonymous guest", async () => {
    const {result} = renderHook(
      () => useEventRuntimeController("runtime_123456789012345678901234"),
      {wrapper: wrapper()}
    );
    await waitFor(() => expect(result.current.stage).toBe("phone"));
    expect(result.current.bootstrap?.event.title).toBe("Courtyard Social");
  });

  it("opens live tools for a ready checked-in runtime identity", async () => {
    runtime.user = {uid: "guest-1"};
    getEventRuntimeBootstrap.mockResolvedValue(bootstrap({
      accessStatus: "ready",
      attendanceStatus: "checkedIn",
      eventId: "event-1",
      organizerId: "club-1",
      requiredFieldIds: ["displayName"],
      completedFieldIds: ["displayName"],
      runtimeProfile: {
        displayName: "Ari",
        gender: null,
        interestedInGenders: [],
        relationshipGoal: null,
        dateOfBirthMillis: null,
      },
    }));
    const {result} = renderHook(
      () => useEventRuntimeController("runtime_123456789012345678901234"),
      {wrapper: wrapper()}
    );
    await waitFor(() => expect(result.current.stage).toBe("runtime"));
    expect(checkInEventRuntime).not.toHaveBeenCalled();
    expect(watchEventRuntimeLiveState).toHaveBeenCalled();
    await waitFor(() => expect(heartbeatEventRuntimePresence)
      .toHaveBeenCalledWith("event-1"));
  });

  it("does not grant attendance from a static runtime link", async () => {
    runtime.user = {uid: "guest-1"};
    getEventRuntimeBootstrap.mockResolvedValue(bootstrap({
      accessStatus: "ready",
      attendanceStatus: "registered",
      eventId: "event-1",
      organizerId: "club-1",
      requiredFieldIds: ["displayName"],
      completedFieldIds: ["displayName"],
      runtimeProfile: {
        displayName: "Ari",
        gender: null,
        interestedInGenders: [],
        relationshipGoal: null,
        dateOfBirthMillis: null,
      },
    }));

    const {result} = renderHook(
      () => useEventRuntimeController("runtime_123456789012345678901234"),
      {wrapper: wrapper()}
    );

    await waitFor(() => expect(result.current.stage).toBe("venue"));
    expect(checkInEventRuntime).not.toHaveBeenCalled();
    expect(watchEventRuntimeLiveState).not.toHaveBeenCalled();
  });

  it("redeems a live venue session before opening runtime tools", async () => {
    runtime.user = {uid: "guest-1"};
    let checkedIn = false;
    getEventRuntimeBootstrap.mockImplementation(async () => bootstrap({
      accessStatus: "ready",
      attendanceStatus: checkedIn ? "checkedIn" : "registered",
      eventId: "event-1",
      organizerId: "club-1",
      requiredFieldIds: ["displayName"],
      completedFieldIds: ["displayName"],
      runtimeProfile: {
        displayName: "Ari",
        gender: null,
        interestedInGenders: [],
        relationshipGoal: null,
        dateOfBirthMillis: null,
      },
    }));
    checkInEventRuntime.mockImplementation(async () => {
      checkedIn = true;
      return {status: "checkedIn", alreadyCheckedIn: false};
    });

    const {result} = renderHook(
      () => useEventRuntimeController(
        "runtime_123456789012345678901234",
        "signed-live-session"
      ),
      {wrapper: wrapper()}
    );

    await waitFor(() => expect(result.current.stage).toBe("runtime"));
    expect(checkInEventRuntime).toHaveBeenCalledWith({
      publicRuntimeId: "runtime_123456789012345678901234",
      venueSessionToken: "signed-live-session",
    });
  });

  it("shares a stable attendee link and records only the Catch share action", async () => {
    runtime.user = {uid: "guest-1"};
    getEventRuntimeBootstrap.mockResolvedValue(bootstrap({
      accessStatus: "ready",
      attendanceStatus: "checkedIn",
      eventId: "event-1",
      organizerId: "club-1",
      requiredFieldIds: ["displayName"],
      completedFieldIds: ["displayName"],
      runtimeProfile: {
        displayName: "Ari",
        gender: null,
        interestedInGenders: [],
        relationshipGoal: null,
        dateOfBirthMillis: null,
      },
    }));
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    const {result} = renderHook(
      () => useEventRuntimeController("runtime_123456789012345678901234"),
      {wrapper: wrapper()}
    );
    await waitFor(() => expect(result.current.stage).toBe("runtime"));
    await waitFor(() => expect(result.current.attendeeInviteLink).not.toBeNull());

    await act(async () => result.current.shareEvent());

    expect(createEventRuntimeAttendeeInviteLink).toHaveBeenCalledWith(
      "event-1",
      "Attendee share"
    );
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: "Courtyard Social",
      url: expect.stringMatching(/\/invite\/v2_invite-1_secret$/u),
    }));
    expect(recordEventRuntimeShareIntent).toHaveBeenCalledWith({
      eventId: "event-1",
      inviteLinkId: "invite-1",
      channelHint: "systemShare",
    });
  });

  it("keeps assigned suggestions unselected in the default opt-in mode", async () => {
    runtime.user = {uid: "guest-1"};
    const ended = bootstrap({
      accessStatus: "ready",
      attendanceStatus: "checkedIn",
      eventId: "event-1",
      organizerId: "club-1",
      requiredFieldIds: ["displayName"],
      completedFieldIds: ["displayName"],
      runtimeProfile: {
        displayName: "Ari",
        gender: null,
        interestedInGenders: [],
        relationshipGoal: null,
        dateOfBirthMillis: null,
      },
    });
    ended.event.endTimeMillis = Date.now() - 1_000;
    getEventRuntimeBootstrap.mockResolvedValue(ended);

    const {result} = renderHook(
      () => useEventRuntimeController("runtime_123456789012345678901234"),
      {wrapper: wrapper()}
    );

    await waitFor(() => expect(result.current.conversationGraph).not.toBeNull());
    expect(result.current.selectedConversationUids).toEqual([]);
    expect(result.current.conversationGraph?.candidates[0]).toEqual({
      uid: "guest-2",
      displayName: "Rhea",
      assigned: true,
    });

    act(() => result.current.toggleConversationUid("guest-2"));
    await act(async () => result.current.submitConversationGraph());

    expect(submitEventSuccessConversationGraph).toHaveBeenCalledWith({
      eventId: "event-1",
      selectedUids: ["guest-2"],
      skipped: false,
    });
  });

  it("honors configured opt-out preselection returned by the server", async () => {
    runtime.user = {uid: "guest-1"};
    const ended = bootstrap({
      accessStatus: "ready",
      attendanceStatus: "checkedIn",
      eventId: "event-1",
      organizerId: "club-1",
      requiredFieldIds: ["displayName"],
      completedFieldIds: ["displayName"],
      runtimeProfile: {
        displayName: "Ari",
        gender: null,
        interestedInGenders: [],
        relationshipGoal: null,
        dateOfBirthMillis: null,
      },
    });
    ended.event.endTimeMillis = Date.now() - 1_000;
    getEventRuntimeBootstrap.mockResolvedValue(ended);
    getEventSuccessConversationGraph.mockResolvedValue({
      eventId: "event-1",
      consentMode: "optOut",
      prompt: "Who were your teammates?",
      candidates: [
        {uid: "guest-2", displayName: "Rhea", assigned: true},
      ],
      selectedUids: ["guest-2"],
      submissionStatus: "unsubmitted",
    });

    const {result} = renderHook(
      () => useEventRuntimeController("runtime_123456789012345678901234"),
      {wrapper: wrapper()}
    );

    await waitFor(() => expect(result.current.conversationGraph).not.toBeNull());
    expect(result.current.selectedConversationUids).toEqual(["guest-2"]);
  });
});

it("discards private runtime bootstrap that completes after sign-out", async () => {
  getEventRuntimeBootstrap.mockReset().mockResolvedValue(bootstrap());
  let auth!: (user: typeof runtime.user) => void;
  let resolve!: (value: unknown) => void;
  runtime.user = {uid: "first"};
  watchEventRuntimeAuthState.mockImplementationOnce((callback) => {
    auth = callback; callback(runtime.user); return vi.fn();
  });
  getEventRuntimeBootstrap.mockImplementationOnce(() => new Promise((done) => {resolve = done;}));
  const {result} = renderHook(() => useEventRuntimeController("runtime-one"), {wrapper: wrapper()});
  act(() => auth(null));
  await waitFor(() => expect(result.current.stage).toBe("phone"));
  await act(async () => resolve(bootstrap({eventId: "event-1", runtimeProfile: {
    displayName: "Private guest", gender: "woman", interestedInGenders: [],
  }})));
  expect(result.current.bootstrap?.participant).toBeNull();
  expect(result.current.displayName).toBe("");
  expect(result.current.liveState.assignments).toEqual([]);
  expect(result.current.stage).toBe("phone");
});
