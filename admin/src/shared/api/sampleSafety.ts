import type {AdminListAccountSafetyActionsCallablePayload} from
  "../../generated/contracts/adminListAccountSafetyActionsCallablePayload";
import type {AdminListAccountSafetyActionsCallableResponse} from
  "../../generated/contracts/adminListAccountSafetyActionsCallableResponse";
import type {AdminTakeAccountSafetyActionCallablePayload} from
  "../../generated/contracts/adminTakeAccountSafetyActionCallablePayload";
import type {AdminTakeAccountSafetyActionCallableResponse} from
  "../../generated/contracts/adminTakeAccountSafetyActionCallableResponse";
import type {AdminLiftAccountSafetyActionCallablePayload} from
  "../../generated/contracts/adminLiftAccountSafetyActionCallablePayload";
import type {AdminLiftAccountSafetyActionCallableResponse} from
  "../../generated/contracts/adminLiftAccountSafetyActionCallableResponse";
import type {AdminDecideSafetyAppealCallablePayload} from
  "../../generated/contracts/adminDecideSafetyAppealCallablePayload";
import type {AdminDecideSafetyAppealCallableResponse} from
  "../../generated/contracts/adminDecideSafetyAppealCallableResponse";
import type {AdminGetSafetySettingsCallableResponse} from
  "../../generated/contracts/adminGetSafetySettingsCallableResponse";
import type {AdminUpdateSafetySettingsCallablePayload} from
  "../../generated/contracts/adminUpdateSafetySettingsCallablePayload";
import type {AdminSearchPeopleCallablePayload} from
  "../../generated/contracts/adminSearchPeopleCallablePayload";
import type {AdminSearchPeopleCallableResponse} from
  "../../generated/contracts/adminSearchPeopleCallableResponse";

/**
 * Sample-mode stand-ins for Safety account actions, appeals, Settings →
 * Safety and People search. They hold state in memory so a sample
 * walkthrough sees an action it just took, the way the live screens do.
 */

type ActionItem = AdminListAccountSafetyActionsCallableResponse["items"][
  number];
type Settings = AdminGetSafetySettingsCallableResponse["settings"];

const DAY = 24 * 3600_000;
const sampleNow = Date.parse("2026-11-01T12:00:00.000Z");
const sampleUid = "sample-owner";

function action(overrides: Partial<ActionItem> & Pick<ActionItem,
  "actionId" | "uid" | "displayName" | "kind" | "reasonCode" |
  "reasonLabel">): ActionItem {
  return {
    messageToUser: "You broke our rule on " +
      `${overrides.reasonLabel.toLowerCase()}.`,
    durationDays: null,
    startsAtMillis: sampleNow - 2 * DAY,
    endsAtMillis: null,
    status: "active",
    decidedByUid: sampleUid,
    decidedByRole: "owner",
    automatic: false,
    appealable: true,
    caseTargetPaths: [],
    appeal: null,
    bookings: {cancelled: 0, needsOrganizer: 0, failed: 0},
    blockedSignupAttempts: 0,
    canReviewAppeal: false,
    ...overrides,
  };
}

const seedActions = (): ActionItem[] => [
  action({
    actionId: "sample-action-vikram", uid: "user_412",
    displayName: "Vikram S.", kind: "ban", reasonCode: "unwanted_contact",
    reasonLabel: "Unwanted contact", startsAtMillis: sampleNow - 20 * DAY,
    decidedByUid: sampleUid, decidedByRole: "owner",
    caseTargetPaths: ["reports/sample-report-vikram"],
    bookings: {cancelled: 1, needsOrganizer: 1, failed: 0},
    blockedSignupAttempts: 1,
    appeal: {status: "open", submittedAtMillis: sampleNow - 2 * DAY,
      text: "I never meant to scare anyone. I only messaged to return her " +
        "jacket. Please let me back, I go to the Sunday runs every week.",
      reviewerUid: null, decidedAtMillis: null, decisionNote: null},
    canReviewAppeal: false,
  }),
  action({
    actionId: "sample-action-arjun", uid: "user_829",
    displayName: "Arjun M.", kind: "restrict", reasonCode: "harassment",
    reasonLabel: "Harassment", durationDays: 7,
    startsAtMillis: sampleNow - DAY, endsAtMillis: sampleNow + 6 * DAY,
    decidedByUid: "sample-ops", decidedByRole: "ops",
    caseTargetPaths: ["reports/sample-report-arjun"],
  }),
  action({
    actionId: "sample-action-auto", uid: "user_301",
    displayName: "Neel P.", kind: "restrict", reasonCode: "threats",
    reasonLabel: "Threats of violence", startsAtMillis: sampleNow - 3600_000,
    decidedByUid: "system", decidedByRole: "system", automatic: true,
    caseTargetPaths: ["reports/sample-report-neel"],
  }),
  action({
    actionId: "sample-action-tara", uid: "user_177",
    displayName: "Tara K.", kind: "warn", reasonCode: "fake_profile",
    reasonLabel: "Fake profile", startsAtMillis: sampleNow - 5 * DAY,
    decidedByUid: "sample-ops", decidedByRole: "ops",
  }),
  action({
    actionId: "sample-action-rohit", uid: "user_090",
    displayName: "Rohit D.", kind: "suspend", reasonCode: "fraud",
    reasonLabel: "Fraud or scam", durationDays: 30,
    startsAtMillis: sampleNow - 4 * DAY, endsAtMillis: sampleNow + 26 * DAY,
    bookings: {cancelled: 2, needsOrganizer: 0, failed: 0},
  }),
];

const seedSettings = (): Settings => ({
  reasons: [
    ["harassment", "Harassment", false, false],
    ["unwanted_contact", "Unwanted contact", false, false],
    ["hate", "Hate or discrimination", false, false],
    ["fake_profile", "Fake profile", false, false],
    ["inappropriate_content", "Inappropriate content", false, false],
    ["spam", "Spam", false, false],
    ["assault", "Physical or sexual assault", true, false],
    ["stalking", "Stalking", true, false],
    ["threats", "Threats of violence", true, false],
    ["intimate_images", "Sharing intimate images", true, true],
    ["minor", "Someone under 18", true, false],
    ["fraud", "Fraud or scam", true, false],
    ["other", "Something else", false, false],
  ].map(([code, label, severe, takedown]) => ({code: String(code),
    label: String(label), severe: Boolean(severe),
    takedown: Boolean(takedown), active: true})),
  restrictOnSevereReport: true,
  organizerBlockLists: true,
  organizerReports: true,
  updatedAtMillis: null,
  updatedByUid: null,
});

let actions = seedActions();
let settings = seedSettings();
let counter = 0;

/** Restores the seed state between tests and stories. */
export function resetSampleSafety(): void {
  actions = seedActions();
  settings = seedSettings();
  counter = 0;
}

export function sampleListAccountSafetyActions(
  payload: AdminListAccountSafetyActionsCallablePayload
): AdminListAccountSafetyActionsCallableResponse {
  const items = actions
    .filter((item) => !payload.uid || item.uid === payload.uid)
    .filter((item) => payload.view === "recent" || item.status === "active")
    .filter((item) => payload.view !== "appeals" ||
      item.appeal?.status === "open")
    .sort((a, b) => b.startsAtMillis - a.startsAtMillis)
    .slice(0, payload.limit)
    .map((item) => ({...item, canReviewAppeal:
      item.appeal?.status === "open" && item.decidedByUid !== sampleUid}));
  return {items};
}

export function sampleTakeAccountSafetyAction(
  payload: AdminTakeAccountSafetyActionCallablePayload
): AdminTakeAccountSafetyActionCallableResponse {
  counter += 1;
  const actionId = `sample-action-new-${counter}`;
  const endsAtMillis = payload.durationDays === null ? null :
    sampleNow + payload.durationDays * DAY;
  const existing = actions.find((item) => item.uid === payload.uid);
  const reason = settings.reasons.find((item) =>
    item.code === payload.reasonCode);
  const bookings = payload.kind === "suspend" || payload.kind === "ban" ?
    {cancelled: 1, needsOrganizer: 0, failed: 0} :
    {cancelled: 0, needsOrganizer: 0, failed: 0};
  actions = [action({
    actionId, uid: payload.uid,
    displayName: existing?.displayName ?? null,
    kind: payload.kind, reasonCode: payload.reasonCode,
    reasonLabel: reason?.label ?? payload.reasonCode,
    messageToUser: payload.messageToUser, durationDays: payload.durationDays,
    startsAtMillis: sampleNow, endsAtMillis,
    caseTargetPaths: payload.caseTargetPath ? [payload.caseTargetPath] : [],
    appealable: payload.appealable, bookings,
  }), ...actions];
  return {actionId, kind: payload.kind, status: "active", endsAtMillis,
    bookings};
}

export function sampleLiftAccountSafetyAction(
  payload: AdminLiftAccountSafetyActionCallablePayload
): AdminLiftAccountSafetyActionCallableResponse {
  actions = actions.map((item) => item.actionId === payload.actionId ?
    {...item, status: "lifted"} : item);
  return {actionId: payload.actionId, status: "lifted"};
}

export function sampleDecideSafetyAppeal(
  payload: AdminDecideSafetyAppealCallablePayload
): AdminDecideSafetyAppealCallableResponse {
  let replacementActionId: string | null = null;
  const original = actions.find((item) => item.actionId === payload.actionId);
  if (original && payload.outcome === "reduce" && payload.reduceTo) {
    replacementActionId = sampleTakeAccountSafetyAction({
      uid: original.uid, kind: payload.reduceTo.kind,
      durationDays: payload.reduceTo.durationDays,
      reasonCode: original.reasonCode, messageToUser: payload.messageToUser,
      caseTargetPath: null, notifyReporter: false, appealable: false,
      note: payload.note,
    }).actionId;
  }
  actions = actions.map((item) => item.actionId !== payload.actionId ? item : {
    ...item,
    status: payload.outcome === "keep" ? item.status :
      payload.outcome === "lift" ? "lifted" : "replaced",
    appeal: item.appeal && {...item.appeal,
      status: payload.outcome === "keep" ? "kept" :
        payload.outcome === "lift" ? "lifted" : "reduced",
      reviewerUid: sampleUid, decidedAtMillis: sampleNow,
      decisionNote: payload.note},
  });
  return {actionId: payload.actionId, outcome: payload.outcome,
    replacementActionId};
}

function settingsResponse(): AdminGetSafetySettingsCallableResponse {
  return {
    settings,
    deadlines: {acknowledge: "immediately", firstLookHours: 24,
      resolveDays: 15, takedownHours: 24},
    stepRoles: {warn: "ops", restrict: "ops", suspend: "owner",
      ban: "owner"},
    retentionDaysAfterDeletion: 180,
  };
}

export function sampleGetSafetySettings():
  AdminGetSafetySettingsCallableResponse {
  return settingsResponse();
}

export function sampleUpdateSafetySettings(
  payload: AdminUpdateSafetySettingsCallablePayload
): AdminGetSafetySettingsCallableResponse {
  settings = {...payload, updatedAtMillis: sampleNow,
    updatedByUid: sampleUid};
  return settingsResponse();
}

type Person = AdminSearchPeopleCallableResponse["rows"][number];

const samplePeople: Person[] = [
  {uid: "user_829", name: "Arjun M.", phone: "+91 ••••• 41120",
    city: "Mumbai", deleted: false},
  {uid: "user_204", name: "Rhea Kapoor", phone: "+91 ••••• 01234",
    city: "Mumbai", deleted: false},
  {uid: "user_355", name: "Meher Bhatt", phone: "+91 ••••• 99881",
    city: "Mumbai", deleted: false},
  {uid: "user_612", name: "Maya Shah", phone: "+91 ••••• 55120",
    city: "Delhi", deleted: false},
  {uid: "user_412", name: "Vikram S.", phone: "+91 ••••• 78002",
    city: "Mumbai", deleted: false},
];

export function sampleSearchPeople(
  payload: AdminSearchPeopleCallablePayload
): AdminSearchPeopleCallableResponse {
  const query = payload.query.trim().toLowerCase();
  const kind = /^user_|^[A-Za-z0-9]{20,}$/u.test(payload.query.trim()) ?
    "uid" : /^[+0-9\s]{6,}$/u.test(query) ? "phone" : "name";
  const digits = query.replace(/[^0-9]/gu, "");
  return {
    kind,
    rows: samplePeople.filter((person) => kind === "uid" ?
      person.uid === payload.query.trim() :
      kind === "phone" ?
        (person.phone ?? "").replace(/[^0-9]/gu, "").endsWith(
          digits.slice(-5)) :
        (person.name ?? "").toLowerCase().includes(query))
      .slice(0, payload.limit),
  };
}
