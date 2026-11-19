import type {TryItCaller} from "../../firebase";
import type {TryItCall, TryItCommandClient, TryItCommandId, TryItMode, TryItProblem, TryItResponse} from "../../shared/api/tryItCommands";

/**
 * Command envelopes as the callables answer them, for the controller tests
 * and the Storybook tool stories. Fictional organisers and reserved domains
 * only; tryItCommands.test.ts checks every one against its response schema.
 */

const hash = (seed: string) => seed.repeat(64).slice(0, 64);
const receipt = (name: string) => `${name}_${"a".repeat(64)}`;
export const fixtureOrganizerId = "WsDriftwood00000000A";
export const fixtureRunId = `tryit-${"b".repeat(40)}`;
export const fixtureEventId = "evtSaltAirSocialRun01";
const instagramLink = {provider: "instagram", support: "instant", reason: null} as const;
const lumaLink = {provider: "luma", support: "instant", reason: null} as const;

export const fixtureCaller: TryItCaller = {uid: "uidDriftwood", phoneNumber: "+919812345678"};

export const workspaceFixtures = {
  previewNew: {
    commandId: "workspace.ensure", status: "previewed", previewHash: hash("1"),
    summary: {headline: "This creates your private organizer profile \"Driftwood Bay Runners\" in Mumbai.",
      lines: ["Only you can see it until you publish it.", "Every tool you try adds to it, and Catch Host shows it when you sign in with this phone number."]},
    effects: [], next: [], receiptId: null,
    result: {organizerId: fixtureOrganizerId, organizerName: "Driftwood Bay Runners", marketId: "in-mh-mumbai", exists: false, created: false,
      publishStatus: "draft", expiresAt: null},
  },
  previewExisting: {
    commandId: "workspace.ensure", status: "previewed", previewHash: hash("2"),
    summary: {headline: "Your organizer profile \"Driftwood Bay Runners\" is ready.", lines: ["Only you can see it until you publish it."]},
    effects: [], next: [], receiptId: null,
    result: {organizerId: fixtureOrganizerId, organizerName: "Driftwood Bay Runners", marketId: "in-mh-mumbai", exists: true, created: false,
      publishStatus: "draft", expiresAt: "2026-12-19T08:00:00.000Z"},
  },
  applied: {
    commandId: "workspace.ensure", status: "applied", previewHash: hash("1"),
    summary: {headline: "Your private organizer profile \"Driftwood Bay Runners\" is ready.", lines: ["Only you can see it until you publish it."]},
    effects: [{kind: "organizer_created", ref: `organizers/${fixtureOrganizerId}`, label: "Private organizer profile \"Driftwood Bay Runners\""}],
    next: [], receiptId: receipt("workspaceEnsure"),
    result: {organizerId: fixtureOrganizerId, organizerName: "Driftwood Bay Runners", marketId: "in-mh-mumbai", exists: true, created: true,
      publishStatus: "draft", expiresAt: "2026-12-19T08:00:00.000Z"},
  },
} satisfies Record<string, TryItResponse<"workspace.ensure">>;

const organizerProposal = {
  name: "Driftwood Bay Runners", nameChanges: false,
  description: "A social 5K on the sea face every Sunday at 6:30, then coffee. All paces welcome.",
  instagramHandle: "driftwoodbayrunners", categories: ["Run club", "Outdoors"],
  sources: [{platform: "instagram", url: "https://www.instagram.example/driftwoodbayrunners"}, {platform: "website", url: "https://driftwoodbayrunners.example/"}],
  events: [
    {title: "Salt Air Social Run", startAt: "2026-11-23T01:00:00.000Z", endAt: null, venue: "Sea face promenade", sourceUrl: "https://driftwoodbayrunners.example/runs/salt-air"},
    {title: "Sandbar 10K", startAt: "2026-11-30T01:00:00.000Z", endAt: null, venue: null, sourceUrl: "https://driftwoodbayrunners.example/runs/sandbar"},
  ],
  eventCount: 2, gaps: [], verificationNeeded: true,
};

const organizerBase = {commandId: "organizer.import-from-link" as const, effects: [] as {kind: string; ref: string | null; label: string}[], next: [] as {commandId: string; label: string}[], receiptId: null};

export const organizerFixtures = {
  noWorkspace: {
    ...organizerBase, status: "needs_input", previewHash: hash("3"),
    summary: {headline: "Set up your organizer profile first.", lines: ["Add your brand name and city, then import your page."]},
    next: [{commandId: "workspace.ensure", label: "Set up your organizer profile"}],
    result: {organizerId: null, runId: null, link: instagramLink, proposal: null, match: null, reasons: ["no_workspace"], pollAfterMs: null},
  },
  running: {
    ...organizerBase, status: "running", previewHash: hash("4"),
    summary: {headline: "Reading instagram.com…", lines: ["This usually takes under a minute."]},
    result: {organizerId: fixtureOrganizerId, runId: fixtureRunId, link: instagramLink, proposal: null, match: null, reasons: [], pollAfterMs: 2000},
  },
  previewed: {
    ...organizerBase, status: "previewed", previewHash: hash("5"),
    summary: {headline: "Here's what we found for \"Driftwood Bay Runners\".", lines: [
      "We'll add the description from the page.", "We'll link Instagram @driftwoodbayrunners.",
      "We found 2 upcoming events. They go live with your page, after our usual checks.",
      "Before you publish, we'll ask you to prove you run this Instagram or Luma page."]},
    result: {organizerId: fixtureOrganizerId, runId: fixtureRunId, link: instagramLink, proposal: organizerProposal, match: null, reasons: [], pollAfterMs: null},
  },
  previewedAgain: {
    ...organizerBase, status: "previewed", previewHash: hash("6"),
    summary: {headline: "Here's what we found for \"Driftwood Bay Runners\".", lines: ["We found 2 upcoming events. They go live with your page, after our usual checks."]},
    result: {organizerId: fixtureOrganizerId, runId: fixtureRunId, link: instagramLink, proposal: {...organizerProposal, description: null},
      match: null, reasons: [], pollAfterMs: null},
  },
  listed: {
    ...organizerBase, status: "needs_input", previewHash: hash("7"),
    summary: {headline: "\"Lantern Lane Supper Club\" is already on Catch.", lines: ["Claim it to manage it as your own."]},
    result: {organizerId: fixtureOrganizerId, runId: fixtureRunId, link: instagramLink, proposal: null,
      match: {verdict: "match", candidates: [{organizerId: "orgLanternLane", name: "Lantern Lane Supper Club", claimable: true}]},
      reasons: ["existing_listing"], pollAfterMs: null},
  },
  refused: {
    ...organizerBase, status: "refused", previewHash: hash("8"),
    summary: {headline: "We can't use this link.", lines: ["Short links hide where they go. Send the full link instead."]},
    result: {organizerId: fixtureOrganizerId, runId: fixtureRunId, link: {provider: null, support: "staff_follow_up", reason: "short_link"},
      proposal: null, match: null, reasons: ["short_link"], pollAfterMs: null},
  },
  applied: {
    ...organizerBase, status: "applied", previewHash: hash("5"),
    summary: {headline: "Your profile now has the details from instagram.com.", lines: ["We'll add the description from the page."]},
    effects: [{kind: "imported_events", ref: `organizers/${fixtureOrganizerId}`, label: "2 upcoming events waiting to publish with your page"}],
    receiptId: receipt("organizerImportFromLink"),
    result: {organizerId: fixtureOrganizerId, runId: fixtureRunId, link: instagramLink, proposal: {...organizerProposal, events: []}, match: null,
      reasons: [], pollAfterMs: null},
  },
} satisfies Record<string, TryItResponse<"organizer.import-from-link">>;

const eventBase = {commandId: "event.import-from-link" as const, effects: [] as {kind: string; ref: string | null; label: string}[], next: [] as {commandId: string; label: string}[], receiptId: null};
const foundEvents = [
  {eventKey: "wiSaltAirSocialRun", title: "Salt Air Social Run", startAt: "2026-11-23T01:00:00.000Z", venue: "Sea face promenade"},
  {eventKey: "wiSandbar10K", title: "Sandbar 10K", startAt: "2026-11-30T01:00:00.000Z", venue: null},
];
const eventProposal = {eventKey: "wiSaltAirSocialRun", name: "Salt Air Social Run", localDate: "2026-11-23", localStartTime: "06:30",
  timezone: "Asia/Kolkata", cityId: "mumbai", marketId: "in-mh-mumbai", venue: "Sea face promenade",
  sourceUrl: "https://events.example/salt-air-social-run"};

export const eventFixtures = {
  running: {
    ...eventBase, status: "running", previewHash: hash("9"),
    summary: {headline: "Reading events.example…", lines: ["This usually takes under a minute."]},
    result: {organizerId: fixtureOrganizerId, runId: fixtureRunId, link: lumaLink, events: [], proposal: null, eventId: null, reasons: [], pollAfterMs: 2000},
  },
  chooseEvent: {
    ...eventBase, status: "needs_input", previewHash: hash("a"),
    summary: {headline: "We found 2 upcoming events.", lines: ["Choose the one to draft."]},
    result: {organizerId: fixtureOrganizerId, runId: fixtureRunId, link: lumaLink, events: foundEvents, proposal: null, eventId: null,
      reasons: ["choose_event"], pollAfterMs: null},
  },
  previewed: {
    ...eventBase, status: "previewed", previewHash: hash("c"),
    summary: {headline: "We'll draft \"Salt Air Social Run\".", lines: ["On 2026-11-23 at 06:30.", "At Sea face promenade. Add the venue in Details to show it.",
      "It stays private: no one can see or book it until you publish it."]},
    result: {organizerId: fixtureOrganizerId, runId: fixtureRunId, link: lumaLink, events: foundEvents, proposal: eventProposal, eventId: null,
      reasons: [], pollAfterMs: null},
  },
  applied: {
    ...eventBase, status: "applied", previewHash: hash("c"),
    summary: {headline: "\"Salt Air Social Run\" is a private draft in your profile.", lines: ["Finish the details, tickets and questions in the Host app."]},
    effects: [{kind: "draft_event", ref: `events/${fixtureEventId}`, label: "Private draft: Salt Air Social Run"}],
    receiptId: receipt("eventImportFromLink"),
    result: {organizerId: fixtureOrganizerId, runId: fixtureRunId, link: lumaLink, events: [], proposal: eventProposal, eventId: fixtureEventId,
      reasons: [], pollAfterMs: null},
  },
} satisfies Record<string, TryItResponse<"event.import-from-link">>;

const kitBase = {commandId: "promotion.create-kit" as const, effects: [] as {kind: string; ref: string | null; label: string}[], next: [] as {commandId: string; label: string}[], receiptId: null};
const campaignId = `kit_${"d".repeat(24)}`;
const plannedLinks = [
  {label: "Instagram", source: "instagram", kind: "channel", inviteLinkId: null, url: null},
  {label: "run club WhatsApp", source: "whatsapp", kind: "channel", inviteLinkId: null, url: null},
  {label: "Kabir", source: null, kind: "promoter", inviteLinkId: null, url: null},
] as const;

export const kitFixtures = {
  previewed: {
    ...kitBase, status: "previewed", previewHash: hash("e"),
    summary: {headline: "We'll make 3 tracked links.", lines: ["Channel: Instagram", "Channel: run club WhatsApp", "Promoter: Kabir",
      "Each link counts its own opens, sign-ups and check-ins. Nothing is sent to anyone."]},
    result: {eventId: fixtureEventId, organizerId: fixtureOrganizerId, campaignId, links: [...plannedLinks], reasons: []},
  },
  applied: {
    ...kitBase, status: "applied", previewHash: hash("e"), receiptId: receipt("promotionCreateKit"),
    summary: {headline: "Your 3 tracked links are ready to share.", lines: ["Share each link where it's named, or print its QR code.",
      "Each link counts its own opens, sign-ups and check-ins. Nothing is sent to anyone."]},
    effects: plannedLinks.map((link, index) => ({kind: "invite_link", ref: `eventInviteLinks/link${index}`, label: `Tracked link: ${link.label}`})),
    result: {eventId: fixtureEventId, organizerId: fixtureOrganizerId, campaignId, reasons: [],
      links: plannedLinks.map((link, index) => ({...link, inviteLinkId: `link${index}`, url: `https://catch.example/invite/tok${index}AbCdEf`}))},
  },
  duplicate: {
    ...kitBase, status: "refused", previewHash: hash("f"),
    summary: {headline: "We can't make this kit.", lines: ["Give each link a different name."]},
    result: {eventId: fixtureEventId, organizerId: null, campaignId, links: [...plannedLinks], reasons: ["duplicate_label"]},
  },
} satisfies Record<string, TryItResponse<"promotion.create-kit">>;

/** One scripted answer: an envelope, or a problem the command client names. */
export type TryItScriptedAnswer<C extends TryItCommandId> = TryItResponse<C> | {problem: TryItProblem};

export interface TryItRecordedCall {
  readonly commandId: TryItCommandId;
  readonly mode: TryItMode;
  readonly idempotencyKey: string;
  readonly input: unknown;
  readonly previewHash?: string;
}

/**
 * A command client that answers from a script, in order, per command and
 * mode, and records every call. The last answer repeats when the script
 * runs out, so a story can stay on a step.
 */
export function scriptedTryItClient(script: {[C in TryItCommandId]?: Partial<Record<TryItMode, readonly TryItScriptedAnswer<C>[]>>},
  caller: TryItCaller | null = fixtureCaller): TryItCommandClient & {calls: TryItRecordedCall[]; setCaller(next: TryItCaller | null): void} {
  const calls: TryItRecordedCall[] = [];
  const used = new Map<string, number>();
  let current = caller;
  return {
    calls,
    setCaller(next) {
      current = next;
    },
    caller: async () => current,
    async call(commandId, request) {
      calls.push({commandId, ...request});
      const answers = (script[commandId]?.[request.mode] ?? []) as readonly TryItScriptedAnswer<typeof commandId>[];
      const at = `${commandId}:${request.mode}`;
      const index = used.get(at) ?? 0;
      used.set(at, index + 1);
      const answer = answers[Math.min(index, answers.length - 1)];
      if (!answer) return {ok: false, problem: "failed", reason: null};
      if ("problem" in answer) return {ok: false, problem: answer.problem, reason: null} as TryItCall<typeof commandId>;
      return {ok: true, response: answer} as TryItCall<typeof commandId>;
    },
  };
}
