import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {isDeepStrictEqual} from "node:util";
import {PROGRAM_WHATSAPP_THREADS, programWhatsappThreadId} from "./ids";
import {reconcileProgramWhatsappThreadView} from "./threadViews";
import {defineProjections} from "../../platform/dispatch/runtime";

const options = {retry: true};
const fanoutLimit = 500;

type Data = FirebaseFirestore.DocumentData | undefined;

const unchanged = (before: Data, after: Data, fields: string[]) =>
  before !== undefined && after !== undefined &&
  isDeepStrictEqual(fields.map((f) => before[f] ?? null),
    fields.map((f) => after[f] ?? null));

/** A thread's inbound message, reply, handling, language or read state. */
export const onProgramWhatsappThreadViewThreadChanged = onDocumentWritten({
  ...options, document: `${PROGRAM_WHATSAPP_THREADS}/{threadId}`,
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["programId", "organizerId", "householdId",
    "guestId", "unknownSender", "handledBy", "state", "language",
    "escalationReason", "lastMessagePreview", "lastMessageDirection",
    "lastMessageAuthor", "lastMessageAtMillis", "lastInboundAtMillis",
    "serviceWindowExpiresAtMillis", "unreadCount", "revision"])) return;
  await reconcileProgramWhatsappThreadView(admin.firestore(),
    event.params.threadId);
});

/**
 * A household's label, contact name, members or side: its thread's row. The
 * thread id is derived from the programme and household, so no query runs.
 */
export const onProgramWhatsappThreadViewHouseholdChanged = onDocumentWritten({
  ...options, document: "programHouseholds/{householdId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["programId", "organizerId", "label",
    "primaryContactName", "memberGuestIds", "side"])) return;
  const db = admin.firestore();
  const programIds = new Set([before?.programId, after?.programId]
    .filter((id): id is string => typeof id === "string" && id.length > 0));
  for (const programId of programIds) {
    await reconcileProgramWhatsappThreadView(db,
      programWhatsappThreadId(programId, event.params.householdId));
  }
});

/** Every WhatsApp thread row of a programme. */
async function reconcileProgramThreadRows(db: FirebaseFirestore.Firestore,
  programId: string): Promise<void> {
  // One equality filter keeps this off the composite index list.
  const threads = await db.collection(PROGRAM_WHATSAPP_THREADS)
    .where("programId", "==", programId)
    .limit(fanoutLimit).get();
  for (const doc of threads.docs) {
    await reconcileProgramWhatsappThreadView(db, doc.id);
  }
}

/**
 * The programme's side labels or organizer: every thread's row.
 * Served by dispatchOrganizerPrograms (issue #2451); it re-reads its sources,
 * so a retry or a replay converges.
 */
export const programWhatsappThreadProgramProjections = defineProjections(
  "organizerPrograms", [{
    id: "programWhatsappThreadView", kind: "projection",
    when: ({before, after}) =>
      !(unchanged(before, after, ["organizerId", "householdSideLabels"])),
    run: (change, ctx) => reconcileProgramThreadRows(ctx.db, change.documentId),
  }]);

/**
 * Dispatcher specs for the triggers above (issue #2451). Each runs its
 * trigger's body with the dispatch change in place of the event; the
 * bodies re-read their sources, so both running is safe until the old
 * triggers retire and these become the only copy.
 */
export const programHouseholdsProjections = defineProjections(
  "programHouseholds", [
    {
      id: "programWhatsappThreadViewHouseholdChanged", kind: "projection",
      when: () => true,
      run: async (change) => {
        const {before, after, documentId} = change;
        if (unchanged(before, after, ["programId", "organizerId", "label",
          "primaryContactName", "memberGuestIds", "side"])) return;
        const db = admin.firestore();
        const programIds = new Set([before?.programId, after?.programId]
          .filter((id): id is string => typeof id === "string" &&
            id.length > 0));
        for (const programId of programIds) {
          await reconcileProgramWhatsappThreadView(db,
            programWhatsappThreadId(programId, documentId));
        }
      },
    },
  ]);
