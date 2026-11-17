import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router";
import {afterEach, describe, expect, it, vi} from "vitest";

const rehearsalController = vi.hoisted(() => ({value: null as any}));

vi.mock("./useEventRehearsalController", () => ({
  useEventRehearsalController: () => rehearsalController.value,
}));

import type {EventRehearsalGuestBootstrap} from "../../firebase";
import {eventRehearsalCopy} from "../../content/eventRehearsal";
import {
  EventRehearsalPage,
  EventRehearsalPreview,
} from "./EventRehearsalPage";

const bootstrap: EventRehearsalGuestBootstrap = {
  slotToken: "slot_1234567890123456_token_12345678901234567890",
  practiceBanner: eventRehearsalCopy.practiceBanner,
  session: {
    title: "Courtyard practice",
    locationName: "Practice studio",
    status: "running",
    activeStepIndex: 1,
    virtualNowMillis: Date.parse("2026-08-19T18:00:00.000Z"),
    attendeePrompt: "Say hello to someone new",
    moduleIds: ["arrival", "firstHello"],
    runtimeRevision: 2,
    faultId: "none",
    movementSimulation: {
      itinerary: [{
        id: "water",
        kind: "stop",
        offsetMinutes: 45,
        title: "Water regroup",
        location: {
          name: "North gate",
          latitude: 19.2,
          longitude: 72.9,
        },
      }],
      routePlan: {
        version: 2,
        movementMode: "run",
        routeShape: "loop",
        groupStrategy: "together",
        stopCadence: "hostedStops",
        stopKinds: ["water"],
        roleKinds: ["routeLead"],
        path: [
          {latitude: 19.1, longitude: 72.8},
          {latitude: 19.2, longitude: 72.9},
        ],
      },
      livePositions: [{
        role: "host",
        latitude: 19.15,
        longitude: 72.85,
        recordedOffsetMinutes: 30,
      }],
      lateArrivalGuidance: "Join at the next published stop: Water regroup.",
    },
  },
  actor: {
    actorId: "actor-01",
    displayName: "Rhea",
    status: "expected",
    guestMoment: "checkIn",
    optedOut: false,
    helpRequested: false,
    promptCompleted: false,
  },
};

afterEach(cleanup);

describe("EventRehearsalPreview", () => {
  it("shows connection loss separately without undoing an arrival", () => {
    render(<EventRehearsalPreview
      bootstrap={{...bootstrap, actor: {...bootstrap.actor,
        status: "present", connectionState: "disconnected"}}}
      onRefresh={vi.fn()} onReply={vi.fn()} onRequiredData={vi.fn()}
      onAction={vi.fn()} pending={false} status={{message: "", tone: ""}}
    />);
    expect(screen.getByText(eventRehearsalCopy.disconnectedNotice)).toBeTruthy();
    expect(screen.getByText("Rhea · Present")).toBeTruthy();
    expect(screen.queryByRole("button", {name: eventRehearsalCopy.checkedIn}))
      .toBeNull();
    expect(screen.queryByRole("button", {name: eventRehearsalCopy.confirmArrival}))
      .toBeNull();
  });

  it("keeps practice identity visible and sends guest actions", () => {
    const onAction = vi.fn();
    render(
      <EventRehearsalPreview
        bootstrap={bootstrap}
        onRefresh={vi.fn()} onReply={vi.fn()} onRequiredData={vi.fn()}
        onAction={onAction}
        pending={false}
        status={{message: "", tone: ""}}
      />
    );

    expect(screen.getByText(eventRehearsalCopy.practiceBanner)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {
      name: eventRehearsalCopy.checkedIn,
    }));
    expect(onAction).toHaveBeenCalledWith("checkIn");
    expect(screen.queryByText(/otp/iu)).toBeNull();
    expect(screen.getByText("Water regroup")).toBeTruthy();
    expect(screen.getByText("Synthetic Host")).toBeTruthy();
    expect(screen.getByRole("img", {
      name: eventRehearsalCopy.routeMapLabel,
    })).toBeTruthy();
    expect(screen.getByText(
      "Join at the next published stop: Water regroup."
    )).toBeTruthy();
  });

  it("offers a synthetic response to a current required-data request", () => {
    const onRequiredData = vi.fn();
    const now = bootstrap.session.virtualNowMillis;
    render(<EventRehearsalPreview bootstrap={{...bootstrap,
      actor: {...bootstrap.actor, requiredData: {
        sourceHash: "a".repeat(64), profileRevision: 0, requestRevision: 1,
        availableFieldIds: ["paceBand", "teamName"], completedFieldIds: [],
        request: {revision: 1, fieldIds: ["paceBand", "teamName"],
          completedFieldIds: [], status: "pending", requestedAt: now,
          expiresAt: now + 60000, completedAt: null},
      }}}} onAction={vi.fn()} onReply={vi.fn()}
      onRequiredData={onRequiredData} onRefresh={vi.fn()} pending={false}
      status={{message: "", tone: ""}} />);
    expect(screen.getByText("Running pace")).toBeTruthy();
    expect(screen.getByText("Team name")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {
      name: eventRehearsalCopy.requiredDataSubmit,
    }));
    expect(onRequiredData).toHaveBeenCalledOnce();
  });

  it("names the preference fields a Host requests without dating wording", () => {
    const now = bootstrap.session.virtualNowMillis;
    render(<EventRehearsalPreview bootstrap={{...bootstrap,
      actor: {...bootstrap.actor, requiredData: {
        sourceHash: "a".repeat(64), profileRevision: 0, requestRevision: 1,
        availableFieldIds: ["interestedInGenders", "relationshipGoal"], completedFieldIds: [],
        request: {revision: 1, fieldIds: ["interestedInGenders", "relationshipGoal"],
          completedFieldIds: [], status: "pending", requestedAt: now,
          expiresAt: now + 60000, completedAt: null},
      }}}} onAction={vi.fn()} onReply={vi.fn()}
      onRequiredData={vi.fn()} onRefresh={vi.fn()} pending={false}
      status={{message: "", tone: ""}} />);
    expect(screen.getByText(eventRehearsalCopy.requiredFieldLabels.interestedInGenders)).toBeTruthy();
    expect(screen.getByText(eventRehearsalCopy.requiredFieldLabels.relationshipGoal)).toBeTruthy();
    expect(screen.queryByText(/relationship goal|who you want to meet|dating/iu)).toBeNull();
  });

  it("keeps a completed practice data request read-only", () => {
    const now = bootstrap.session.virtualNowMillis;
    render(<EventRehearsalPreview bootstrap={{...bootstrap,
      actor: {...bootstrap.actor, requiredData: {
        sourceHash: "b".repeat(64), profileRevision: 1, requestRevision: 1,
        availableFieldIds: ["paceBand"], completedFieldIds: ["paceBand"],
        request: {revision: 1, fieldIds: ["paceBand"],
          completedFieldIds: ["paceBand"], status: "completed",
          requestedAt: now, expiresAt: now + 60000, completedAt: now},
      }}}} onAction={vi.fn()} onReply={vi.fn()}
      onRequiredData={vi.fn()} onRefresh={vi.fn()} pending={false}
      status={{message: "", tone: ""}} />);
    expect(screen.getByText(eventRehearsalCopy.requiredDataComplete)).toBeTruthy();
    expect(screen.queryByRole("button", {
      name: eventRehearsalCopy.requiredDataSubmit,
    })).toBeNull();
  });

  it("shows fault guidance and removes actions when practice completes", () => {
    render(
      <EventRehearsalPreview
        bootstrap={{
          ...bootstrap,
          session: {
            ...bootstrap.session,
            status: "complete",
            faultId: "reducedMotion",
          },
          actor: {...bootstrap.actor, guestMoment: "complete"},
        }}
        onRefresh={vi.fn()} onReply={vi.fn()} onRequiredData={vi.fn()}
        onAction={vi.fn()}
        pending={false}
        status={{message: "", tone: ""}}
      />
    );

    expect(screen.getByRole("heading", {
      name: eventRehearsalCopy.completeTitle,
    })).toBeTruthy();
    expect(screen.getByText(eventRehearsalCopy.faultNotices.reducedMotion))
      .toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("EventRehearsalPage", () => {
  it("renders a practice-specific loading state while redeeming a slot", () => {
    rehearsalController.value = {
      bootstrap: null,
      isLoading: true,
      isUnavailable: false,
      pending: false,
      refresh: vi.fn(),
      status: {message: "", tone: ""},
      submit: vi.fn(),
    };
    renderPage();

    expect(screen.getByRole("heading", {
      name: eventRehearsalCopy.loadingTitle,
    })).toBeTruthy();
    expect(screen.getByText(eventRehearsalCopy.practiceBanner)).toBeTruthy();
  });

  it("fails closed and offers retry for an unavailable practice link", () => {
    const refresh = vi.fn();
    rehearsalController.value = {
      bootstrap: null,
      isLoading: false,
      isUnavailable: true,
      pending: false,
      refresh,
      status: {message: "", tone: ""},
      submit: vi.fn(),
    };
    renderPage();

    fireEvent.click(screen.getByRole("button", {
      name: eventRehearsalCopy.retry,
    }));
    expect(refresh).toHaveBeenCalledWith();
    expect(screen.getByRole("heading", {
      name: eventRehearsalCopy.unavailableTitle,
    })).toBeTruthy();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[
      "/rehearse/practice_12345678901234567890",
    ]}>
      <Routes>
        <Route
          path="/rehearse/:publicRehearsalId"
          element={<EventRehearsalPage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("rehearsal joining instructions", () => {
  const message = {
    messageId: `outbox:${"a".repeat(64)}`, intentId: `message:${"b".repeat(64)}`,
    intentRevision: 1, text: "Join us at the first stop.",
    choices: [{choiceId: "on-my-way", label: "On my way"},
      {choiceId: "not-coming", label: "Not coming"}],
    lifecycle: "active" as const, expiresAt: bootstrap.session.virtualNowMillis + 60000,
    canRespond: true, responseChoiceId: null,
  };
  const props = {bootstrap: {...bootstrap, actor: {...bootstrap.actor, assistanceMessage: message}},
    onAction: vi.fn(), onReply: vi.fn(), onRequiredData: vi.fn(),
    onRefresh: vi.fn(),
    pending: false, status: {message: "", tone: "" as const}};
  it("submits a typed reply independently of the check-in control", () => {
    render(<EventRehearsalPreview {...props} />);
    fireEvent.click(screen.getByRole("button", {name: "On my way"}));
    expect(props.onReply).toHaveBeenCalledWith({messageId: message.messageId,
      intentRevision: 1, choiceId: "on-my-way"});
    expect(props.onAction).not.toHaveBeenCalled();
    expect(screen.getByText(eventRehearsalCopy.joiningBody)).toBeTruthy();
    expect(screen.getByRole("button", {name: eventRehearsalCopy.checkedIn})).toBeTruthy();
  });
  it("offers only the same response while an earlier submission is uncertain", () => {
    render(<EventRehearsalPreview {...props} replyState={{fresh: true,
      pendingChoice: null, retryChoice: "on-my-way", notice: eventRehearsalCopy.replyUncertain}} />);
    expect(screen.getByRole<HTMLButtonElement>("button", {name: "Not coming"}).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", {name: "On my way"}).disabled).toBe(false);
    expect(screen.getByRole<HTMLButtonElement>("button", {name: eventRehearsalCopy.checkedIn}).disabled)
      .toBe(true);
    fireEvent.click(screen.getByRole("button", {name: eventRehearsalCopy.refresh}));
    expect(props.onRefresh).toHaveBeenCalled();
  });
  it("shows a saved reply after closure and retains the physical attendance label", () => {
    render(<EventRehearsalPreview {...props} bootstrap={{...props.bootstrap,
      session: {...bootstrap.session, status: "complete"},
      actor: {...props.bootstrap.actor, assistanceMessage: {...message,
        responseChoiceId: "on-my-way", lifecycle: "responded", canRespond: false}}}} />);
    expect(screen.getByText("Reply saved: On my way")).toBeTruthy();
    expect(screen.getByText("Rhea · Expected")).toBeTruthy();
    expect(screen.queryByRole("button", {name: "On my way"})).toBeNull();
  });
  it("never offers a response past its virtual expiry", () => {
    render(<EventRehearsalPreview {...props} bootstrap={{...props.bootstrap,
      session: {...bootstrap.session, virtualNowMillis: message.expiresAt}}} />);
    expect(screen.queryByRole("button", {name: "On my way"})).toBeNull();
    expect(screen.getByText(eventRehearsalCopy.replyClosed)).toBeTruthy();
  });
});
