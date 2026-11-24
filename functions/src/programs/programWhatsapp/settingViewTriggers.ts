import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  reconcileOrganizerSenderViews,
  reconcileProgramAssistantSettingView,
  reconcileProgramSenderView,
} from "./settingViews";
import {defineProjections} from "../../platform/dispatch/runtime";

const options = {retry: true};

type Data = FirebaseFirestore.DocumentData | undefined;

const same = (before: Data, after: Data, fields: string[]) =>
  before !== undefined && after !== undefined &&
  fields.every((field) =>
    JSON.stringify(before[field] ?? null) ===
      JSON.stringify(after[field] ?? null));

/** A programme's sender and assistant settings views. */
async function reconcileProgramSettingViews(db: FirebaseFirestore.Firestore,
  programId: string): Promise<void> {
  await reconcileProgramSenderView(db, programId);
  await reconcileProgramAssistantSettingView(db, programId);
}

/**
 * A programme appearing, vanishing, moving organizer or binding another
 * WhatsApp number: its sender and assistant settings views.
 */
export const onProgramSettingViewProgramChanged = onDocumentWritten({
  ...options, document: "organizerPrograms/{programId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (same(before, after, ["organizerId", "whatsappSenderConnectionId"])) {
    return;
  }
  await reconcileProgramSettingViews(admin.firestore(), event.params.programId);
});

/**
 * A programme's organizer or WhatsApp number: its settings views.
 * dispatchOrganizerPrograms (issue #2451) runs the same work; both run
 * until the old trigger retires, which is safe because it re-reads its
 * sources, so a retry, a replay or a second run converges.
 */
export const programSettingViewProgramProjections = defineProjections(
  "organizerPrograms", [{
    id: "programSettingView", kind: "projection",
    when: ({before, after}) =>
      !(same(before, after, ["organizerId", "whatsappSenderConnectionId"])),
    run: (change, ctx) =>
      reconcileProgramSettingViews(ctx.db, change.documentId),
  }]);

/** A settings save: that programme's assistant settings view. */
export const onProgramSettingViewSettingsChanged = onDocumentWritten({
  ...options, document: "programAssistantSettings/{programId}",
}, async (event) => {
  await reconcileProgramAssistantSettingView(admin.firestore(),
    event.params.programId);
});

/**
 * A staff grant issued, renamed, renewed, revoked or removed: the staff
 * list of its programme's assistant settings view.
 */
export const onProgramSettingViewGrantChanged = onDocumentWritten({
  ...options, document: "programStaffGrants/{grantId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (same(before, after, ["programId", "organizerId", "uid", "status",
    "revokedAt", "displayName", "expiresAt"])) return;
  const programIds = new Set<string>();
  for (const data of [before, after]) {
    if (typeof data?.programId === "string" && data.programId) {
      programIds.add(data.programId);
    }
  }
  for (const programId of programIds) {
    await reconcileProgramAssistantSettingView(admin.firestore(), programId);
  }
});

/**
 * A WhatsApp sender connected, renamed, changing status or disconnected:
 * the sender view of every programme of its organizer, before and after.
 */
export const onProgramSenderViewConnectionChanged = onDocumentWritten({
  ...options, document: "organizerSenderConnections/{connectionId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (same(before, after, ["organizerId", "channel", "status",
    "displayPhoneNumber", "verifiedName"])) return;
  const organizerIds = new Set<string>();
  for (const data of [before, after]) {
    if (typeof data?.organizerId === "string" && data.organizerId) {
      organizerIds.add(data.organizerId);
    }
  }
  for (const organizerId of organizerIds) {
    await reconcileOrganizerSenderViews(admin.firestore(), organizerId);
  }
});

/**
 * Dispatcher specs for the triggers above (issue #2451). Each runs its
 * trigger's body with the dispatch change in place of the event; the
 * bodies re-read their sources, so both running is safe until the old
 * triggers retire and these become the only copy.
 */
export const programStaffGrantsProjections = defineProjections(
  "programStaffGrants", [
    {
      id: "programSettingViewGrantChanged", kind: "projection",
      when: () => true,
      run: async (change) => {
        const {before, after} = change;
        if (same(before, after, ["programId", "organizerId", "uid", "status",
          "revokedAt", "displayName", "expiresAt"])) return;
        const programIds = new Set<string>();
        for (const data of [before, after]) {
          if (typeof data?.programId === "string" && data.programId) {
            programIds.add(data.programId);
          }
        }
        for (const programId of programIds) {
          await reconcileProgramAssistantSettingView(admin.firestore(),
            programId);
        }
      },
    },
  ]);
