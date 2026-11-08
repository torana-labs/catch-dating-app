import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const runtimeController = vi.hoisted(() => ({value: null as any}));

vi.mock("./useEventRuntimeController", () => ({
  useEventRuntimeController: () => runtimeController.value,
}));

import {
  eventRuntimeCopy,
  eventRuntimeSocialMissionCopy,
} from "../../content/eventRuntime";
import {EventRuntimePage} from "./EventRuntimePage";

function controller() {
  return new Proxy({
    attendeeInviteLink: null,
    attendeeInviteLinkLoading: false,
    bootstrap: {
      event: {
        endTimeMillis: Date.now() - 1_000,
        eventId: "event-1",
        checkedInCount: 18,
        locationName: "The Courtyard",
        moduleIds: [],
        serverTimeMillis: Date.now(),
        startTimeMillis: Date.now() - 3_600_000,
        title: "Courtyard Social",
      },
      participant: {
        attendanceStatus: "checkedIn",
        eventId: "event-1",
      },
    },
    conversationGraph: {
      candidates: [
        {assigned: true, displayName: "Rhea", uid: "guest-2"},
        {assigned: false, displayName: "Mina", uid: "guest-3"},
      ],
      consentMode: "optIn",
      eventId: "event-1",
      prompt: "Who were your tablemates?",
      selectedUids: [],
      submissionStatus: "unsubmitted",
    },
    conversationGraphLoading: false,
    eventEnded: true,
    liveState: {
      assignments: [],
      compatibilityAnswerIds: [],
      feedback: null,
      lateArrival: null,
      mission: null,
      plan: null,
      standings: null,
      wingmanTargetUid: null,
    },
    pending: false,
    questionnaire: {questions: [], title: ""},
    selectedConversationUids: [],
    stage: "runtime",
    status: {message: "", tone: ""},
    requestHostHelp: vi.fn(),
    submitConversationGraph: vi.fn(),
    toggleConversationUid: vi.fn(),
  }, {
    get: (target, key) => key in target ?
      target[key as keyof typeof target] : vi.fn(),
  });
}

describe("EventRuntimePage conversation graph", () => {
  beforeEach(() => {
    runtimeController.value = controller();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders one private roster-chip mechanism with server-owned format copy", () => {
    render(
      <MemoryRouter initialEntries={["/join/runtime-1"]}>
        <Routes>
          <Route path="/join/:publicRuntimeId" element={<EventRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", {
      name: "Who were your tablemates?",
    })).toBeTruthy();
    const assignedChip = screen.getByRole("button", {
      name: `Rhea · ${eventRuntimeCopy.conversationSuggested}`,
    });
    fireEvent.click(assignedChip);
    expect(runtimeController.value.toggleConversationUid)
      .toHaveBeenCalledWith("guest-2");

    fireEvent.click(screen.getByRole("button", {
      name: eventRuntimeCopy.conversationSave,
    }));
    expect(runtimeController.value.submitConversationGraph)
      .toHaveBeenCalledWith();
    expect(screen.getByText(eventRuntimeCopy.conversationPrivacy))
      .toBeTruthy();
  });

  it("asks the host for help from the live screen and keeps help and safety apart", () => {
    render(
      <MemoryRouter initialEntries={["/join/runtime-1"]}>
        <Routes>
          <Route path="/join/:publicRuntimeId" element={<EventRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", {name: eventRuntimeCopy.hostHelpAction}));
    expect(runtimeController.value.requestHostHelp).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", {name: eventRuntimeCopy.safetyAction})
      .getAttribute("href")).toBe("/help/");
  });

  it("renders the same server-clocked reveal midpoint and arrival count", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_786_703_405_000);
    runtimeController.value = controller();
    runtimeController.value.bootstrap.event.moduleIds = ["live_reveal"];
    runtimeController.value.liveState.plan = {
      attendeePrompt: null,
      activeStepIndex: 0,
      activeRevealRoundIndex: 2,
      publishedRevealRoundIndex: -1,
      publishedRotationRoundIndex: -1,
      revealCountdownSeconds: 10,
      revealStartedAtMillis: 1_786_703_400_000,
      revealStatus: "countingDown",
      status: "live",
    };

    const {container} = render(
      <MemoryRouter initialEntries={["/join/runtime-1"]}>
        <Routes>
          <Route path="/join/:publicRuntimeId" element={<EventRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(container.querySelector("[data-phase='anticipation']")).toBeTruthy();
    expect(screen.getByRole("progressbar", {
      name: eventRuntimeCopy.revealMeterLabel,
    }).getAttribute("aria-valuenow")).toBe("50");
    expect(screen.getByText(eventRuntimeCopy.checkedInCount(18)))
      .toBeTruthy();
  });

  it("renders authored movement, pace groups, and a private route schematic", () => {
    const now = Date.now();
    runtimeController.value = controller();
    runtimeController.value.bootstrap.event.startTimeMillis = now - 3_600_000;
    runtimeController.value.bootstrap.event.serverTimeMillis = now;
    runtimeController.value.bootstrap.event.itinerary = [{
      id: "next-stop",
      kind: "stop",
      offsetMinutes: 90,
      title: "Water regroup",
    }];
    runtimeController.value.bootstrap.event.routePlan = {
      version: 2,
      movementMode: "run",
      routeShape: "loop",
      groupStrategy: "paceGroups",
      stopCadence: "hostedStops",
      stopKinds: ["water"],
      roleKinds: ["routeLead", "sweep"],
      path: [
        {latitude: 19.1, longitude: 72.8},
        {latitude: 19.2, longitude: 72.9},
      ],
      paceGroups: [{
        id: "social",
        label: "Social",
        targetPaceSecondsPerKm: 450,
        sortOrder: 0,
      }],
    };
    runtimeController.value.bootstrap.event.livePositions = [{
      role: "host",
      latitude: 19.15,
      longitude: 72.85,
      accuracyMeters: 8,
      headingDegrees: 90,
      recordedAtMillis: now,
      staleAtMillis: now + 120_000,
    }];

    render(
      <MemoryRouter initialEntries={["/join/runtime-1"]}>
        <Routes>
          <Route path="/join/:publicRuntimeId" element={<EventRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", {
      name: eventRuntimeCopy.runOfShowTitle,
    })).toBeTruthy();
    expect(screen.getByText("Water regroup")).toBeTruthy();
    expect(screen.getByText("Social")).toBeTruthy();
    expect(screen.getByText("7:30/km")).toBeTruthy();
    expect(screen.getByRole("img", {
      name: eventRuntimeCopy.movingGroupMapLabel,
    })).toBeTruthy();
    expect(screen.getByText(
      eventRuntimeCopy.nextPublishedStop("Water regroup")
    )).toBeTruthy();
  });

  it("gives an approved late arrival scheduled guidance before venue check-in", () => {
    const now = Date.now();
    runtimeController.value = controller();
    runtimeController.value.stage = "venue";
    runtimeController.value.bootstrap.participant.attendanceStatus = "registered";
    runtimeController.value.bootstrap.event.startTimeMillis = now - 3_600_000;
    runtimeController.value.bootstrap.event.serverTimeMillis = now;
    runtimeController.value.bootstrap.event.itinerary = [{
      id: "next-stop",
      kind: "stop",
      offsetMinutes: 90,
      title: "Water regroup",
      location: {
        name: "North gate",
        latitude: 19.16,
        longitude: 72.86,
      },
    }];
    runtimeController.value.bootstrap.event.routePlan = {
      version: 2,
      movementMode: "run",
      routeShape: "loop",
      groupStrategy: "together",
      stopCadence: "hostedStops",
      stopKinds: ["water"],
      roleKinds: ["routeLead", "sweep"],
      path: [
        {latitude: 19.1, longitude: 72.8},
        {latitude: 19.2, longitude: 72.9},
      ],
    };
    runtimeController.value.bootstrap.event.livePositions = [];

    render(
      <MemoryRouter initialEntries={["/join/runtime-1"]}>
        <Routes>
          <Route path="/join/:publicRuntimeId" element={<EventRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", {
      name: eventRuntimeCopy.venueTitle,
    })).toBeTruthy();
    expect(screen.getByText(eventRuntimeCopy.movingGroupScheduledBody))
      .toBeTruthy();
    expect(screen.getByText(
      eventRuntimeCopy.nextPublishedStop("Water regroup")
    )).toBeTruthy();
    expect(screen.queryByRole("heading", {name: eventRuntimeCopy.shareTitle}))
      .toBeNull();
  });

  it("renders the disclosure level selected by the live run-of-show", () => {
    runtimeController.value.bootstrap.event.moduleIds = ["social_missions"];
    runtimeController.value.bootstrap.event.interactionModel = "pacePods";
    runtimeController.value.liveState.plan = {
      attendeePrompt: null,
      activeStepIndex: 1,
      activeRevealRoundIndex: 0,
      publishedRevealRoundIndex: -1,
      publishedRotationRoundIndex: -1,
      revealCountdownSeconds: null,
      revealStartedAtMillis: null,
      revealStatus: "idle",
      status: "live",
    };

    render(
      <MemoryRouter initialEntries={["/join/runtime-1"]}>
        <Routes>
          <Route path="/join/:publicRuntimeId" element={<EventRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", {
      name: eventRuntimeSocialMissionCopy.titles.personal,
    })).toBeTruthy();
    expect(screen.getByText(eventRuntimeSocialMissionCopy.prompts[
      "shared.personal"
    ])).toBeTruthy();
  });
});
