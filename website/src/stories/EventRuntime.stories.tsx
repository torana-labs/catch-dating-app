import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, within} from "storybook/test";
import {eventRuntimeCopy} from "../content/eventRuntime";
import {EventRehearsalPreview} from "../features/eventRehearsal/EventRehearsalPage";
import {EventRuntimeView, type EventRuntimeController} from "../features/eventRuntime/EventRuntimePage";
import type {EventRehearsalGuestBootstrap} from "../firebase";
import {demoEventId, demoEventName, eventTimesMillis, viewerGuest, world} from "./fixtures/demoWorld";

// The guest's night in the browser (P4.6) at the boards' phone width: the
// RbWebLiveJoin join frame, the RbWebLive round, the RbWebLiveReveal scores
// and the practice screens. Everything is synthetic, from the Mumbai demo world.

const viewports = {
  livePhone: {name: "Live · phone 390", styles: {width: "390px", height: "900px"}, type: "mobile"},
} as const;

const meta = {
  title: "Marketing Website/Event runtime",
  parameters: {viewport: {options: viewports}},
  globals: {viewport: {value: "livePhone", isRotated: false}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const empty = () => undefined;
const asyncEmpty = async () => undefined;
const {startMillis} = eventTimesMillis(demoEventId);
const venue = world.venues.find((candidate) => candidate.id === world.events[0].venueId)!.name;
const guest = viewerGuest(demoEventId);
const minute = 60_000;
// The round sits 92 minutes into the night: round two, Mumbai food.
const roundNow = startMillis + 92 * minute;

const plan = [
  {id: "doors", kind: "gather", offsetMinutes: 0, durationMinutes: 30, title: "Doors and teams"},
  {id: "round-1", kind: "activity", offsetMinutes: 30, durationMinutes: 40, title: "Round one"},
  {id: "mix", kind: "transition", offsetMinutes: 70, durationMinutes: 20, title: "Mix the teams"},
  {id: "round-2", kind: "activity", offsetMinutes: 90, durationMinutes: 40, title: "Mumbai food",
    description: "Write answers on your team's sheet. The host collects them at the end of the round."},
  {id: "scores", kind: "finish", offsetMinutes: 130, durationMinutes: 20, title: "Scores and goodbyes"},
] as const;

const entries = [
  ["quizzy", "Quizzy Rascals", 47],
  ["harbour", "Harbour Lights", 44],
  ["vada-pav", "Vada Pav Theory", 42],
  ["late-ones", "The Late Ones", 34],
  ["table-six", "Table Six", 31],
  ["sea-link", "Sea Link Sleepers", 28],
].map(([unitId, unitLabel, value], index) => ({
  unitId: unitId as string, unitLabel: unitLabel as string, position: index + 1, value: value as number, roundsRecorded: 2,
}));

function bootstrap(serverTimeMillis: number) {
  return {
    event: {
      eventId: demoEventId, publicRuntimeId: "preview-runtime", title: demoEventName,
      startTimeMillis: startMillis, endTimeMillis: startMillis + 150 * minute, serverTimeMillis,
      locationName: venue, checkedInCount: 28, runtimeTermsVersion: "preview",
      moduleIds: ["first_hello_check_in", "live_reveal"], interactionModel: "teamRotations",
      itinerary: [...plan], routePlan: null, livePositions: [], layout: null,
      requiredFieldIds: ["teamName"], optionalFieldIds: [], questionnaireConfig: null,
    },
    participant: {
      eventAttendeeId: null, accessStatus: "ready", attendanceStatus: "checkedIn",
      eventId: demoEventId, organizerId: world.organizer.id, requiredFieldIds: [], completedFieldIds: [],
      runtimeProfile: {
        displayName: guest.firstName, gender: null, interestedInGenders: [], relationshipGoal: null,
        dateOfBirthMillis: null, paceBand: null, skillBand: null, dietaryAndSeatingNotes: null,
        questionnaireAnswerIds: [], teamName: "Harbour Lights",
      },
    },
  } as unknown as NonNullable<EventRuntimeController["bootstrap"]>;
}

const liveState: EventRuntimeController["liveState"] = {
  assignments: [], compatibilityAnswerIds: [], feedback: null, lateArrival: null, mission: null,
  plan: {attendeePrompt: null, activeStepIndex: 3, activeRevealRoundIndex: 0, publishedRevealRoundIndex: -1,
    publishedRotationRoundIndex: 0, revealCountdownSeconds: null, revealStartedAtMillis: null,
    revealStatus: "idle", status: "live"},
  standings: null, wingmanTargetUid: null,
};

const controller = {
  stage: "runtime", bootstrap: bootstrap(roundNow), liveState, pending: false, status: {message: "", tone: ""},
  phoneNumber: "", code: "", displayName: guest.firstName, teamName: "", recaptchaContainerId: "preview-recaptcha",
  preEventFieldId: null, preEventConsent: false, offersPreferenceProfile: false, preferenceProfileEnabled: false,
  saveAsCatchPrefill: false, sensitiveConsent: false, gender: null, interestedInGenders: [], paceBand: null,
  skillBand: null, dietaryAndSeatingNotes: "", questionnaire: {title: "", questions: []}, questionAnswers: {},
  attendeeInviteLink: null, attendeeInviteLinkLoading: false, wingmanCandidates: [], wingmanTargetUid: "",
  eventEnded: false, conversationGraph: null, conversationGraphLoading: false, selectedConversationUids: [],
  welcomeRating: 4, structureRating: 4, metNewPeopleCount: 2, safetyConcern: false, privateNote: "",
  publicRuntimeId: "preview-runtime",
  handlePhoneSubmit: (event: {preventDefault: () => void}) => event.preventDefault(),
  handleCodeSubmit: (event: {preventDefault: () => void}) => event.preventDefault(),
  handleProfileSubmit: (event: {preventDefault: () => void}) => event.preventDefault(),
  handleRefresh: asyncEmpty, startFirstHello: asyncEmpty, completeFirstHello: asyncEmpty, shareEvent: asyncEmpty,
  retryAttendeeInviteLink: empty, saveCompatibilityAnswers: asyncEmpty, submitWingmanRequest: asyncEmpty,
  withdrawWingmanRequest: asyncEmpty, submitConversationGraph: asyncEmpty, submitFeedback: asyncEmpty,
  toggleConversationUid: empty, toggleInterest: empty, selectQuestionAnswer: empty,
  setPhoneNumber: empty, setCode: empty, setDisplayName: empty, setTeamName: empty, setPreEventConsent: empty,
  setPreferenceProfileEnabled: empty, setSaveAsCatchPrefill: empty, setSensitiveConsent: empty, setGender: empty,
  setPaceBand: empty, setSkillBand: empty, setDietaryAndSeatingNotes: empty, setWingmanTargetUid: empty,
  setWelcomeRating: empty, setStructureRating: empty, setMetNewPeopleCount: empty, setSafetyConcern: empty,
  setPrivateNote: empty,
} as unknown as EventRuntimeController;

/** Join: the tonight badge, the title, the phone number you booked with. */
export const Join: Story = {
  render: () => <EventRuntimeView controller={{...controller, stage: "phone", bootstrap: bootstrap(startMillis + 8 * minute),
    phoneNumber: "+91 98201 44718"}} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: eventRuntimeCopy.joinTitle(demoEventName)})).toBeVisible();
    await expect(canvas.getByText(eventRuntimeCopy.joinBadge(venue))).toBeVisible();
  },
};

/** Join, once the code is accepted: the verified phone, the team name and Join tonight. */
export const JoinTeam: Story = {
  render: () => <EventRuntimeView controller={{...controller, stage: "profile", bootstrap: bootstrap(startMillis + 8 * minute),
    phoneNumber: "+91 98201 44718", preEventFieldId: "teamName", teamName: "Harbour Lights"}} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", {name: eventRuntimeCopy.continueAction})).toBeVisible();
  },
};

/** The code step between the two. */
export const JoinCode: Story = {
  render: () => <EventRuntimeView controller={{...controller, stage: "otp", bootstrap: bootstrap(startMillis + 8 * minute)}} />,
};

/** The round: the Now spotlight, the first hello, Tonight and the help button. */
export const Round: Story = {
  render: () => <EventRuntimeView controller={controller} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {name: "Mumbai food"})).toBeVisible();
    await expect(canvas.getByRole("heading", {name: eventRuntimeCopy.runOfShowTitle})).toBeVisible();
  },
};

/** The round after round one's scores are out: the ranked rows, yours selected. */
export const RoundScores: Story = {
  render: () => <EventRuntimeView controller={{...controller, liveState: {...liveState,
    plan: {...liveState.plan!, publishedRevealRoundIndex: 0, revealStatus: "revealed"},
    standings: {eventId: demoEventId, organizerId: world.organizer.id, unitOutcome: "score", revision: 1, latestRoundIndex: 0,
      rounds: [{roundIndex: 0, entries: entries.slice(0, 4)}], entries: entries.slice(0, 4)} as unknown as EventRuntimeController["liveState"]["standings"]}}} />,
};

/** The reveal: your place, everyone ranked, and getting the app. */
export const Reveal: Story = {
  render: () => <EventRuntimeView controller={{...controller, bootstrap: bootstrap(startMillis + 131 * minute), liveState: {...liveState,
    plan: {...liveState.plan!, publishedRevealRoundIndex: 1, revealStatus: "revealed", status: "complete"},
    standings: {eventId: demoEventId, organizerId: world.organizer.id, unitOutcome: "score", revision: 2, latestRoundIndex: 1,
      rounds: [{roundIndex: 1, entries}], entries} as unknown as EventRuntimeController["liveState"]["standings"]}}} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {name: eventRuntimeCopy.placeOrdinal(2)})).toBeVisible();
    await expect(canvas.getByRole("link", {name: eventRuntimeCopy.stayInTouch})).toBeVisible();
  },
};

const rehearsal: EventRehearsalGuestBootstrap = {
  slotToken: "slot_1234567890123456_token_12345678901234567890",
  practiceBanner: "Practice mode · Nothing here affects a real event",
  session: {
    title: `${demoEventName} dress rehearsal`, locationName: "Practice venue", status: "running", activeStepIndex: 3,
    virtualNowMillis: roundNow, attendeePrompt: "Ask someone which round they wanted more questions from.",
    moduleIds: ["arrival", "firstHello", "pods", "rotations", "reveal"], runtimeRevision: 8, faultId: "none",
  },
  actor: {actorId: "actor-03", displayName: guest.firstName, status: "present", guestMoment: "firstHello",
    optedOut: false, helpRequested: false, promptCompleted: false},
};

/** Practice: the same screens under the practice notice, with the guest controls. */
export const Rehearsal: Story = {
  render: () => <EventRehearsalPreview bootstrap={rehearsal} onAction={empty} onRefresh={empty} onReply={empty}
    onRequiredData={empty} pending={false} status={{message: "", tone: ""}} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(rehearsal.practiceBanner)).toBeVisible();
  },
};
