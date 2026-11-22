import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  applyOrganizerProgramCountWrite,
  recountAllOrganizerPrograms,
} from "./organizerProgramCounts";

const options = {retry: true};

/** A guest added, removed, anonymized or replying: the list counts. */
export const onOrganizerProgramGuestCountChanged = onDocumentWritten({
  ...options, document: "programGuests/{guestId}",
}, async (event) => {
  await applyOrganizerProgramCountWrite(admin.firestore(), {
    source: "guests", eventId: event.id, eventTime: event.time,
    before: event.data?.before.data(), after: event.data?.after.data(),
  });
});

/** An inbound journey added, removed or entering or leaving no-show. */
export const onOrganizerProgramTravelLegCountChanged = onDocumentWritten({
  ...options, document: "programTravelLegs/{legId}",
}, async (event) => {
  await applyOrganizerProgramCountWrite(admin.firestore(), {
    source: "travelLegs", eventId: event.id, eventTime: event.time,
    before: event.data?.before.data(), after: event.data?.after.data(),
  });
});

/**
 * Recounts every programme's list counts each night, the backstop for any
 * delta a trigger missed.
 */
export const reconcileOrganizerProgramCountsSweep = onSchedule(
  {
    schedule: "every day 03:45",
    timeoutSeconds: 540,
    maxInstances: 1,
    timeZone: "Asia/Kolkata",
  },
  async () => {
    const summary = await recountAllOrganizerPrograms(admin.firestore(), {
      deadlineMillis: Date.now() + 480 * 1000,
    });
    if (summary.written > 0 || summary.stoppedEarly || summary.busy > 0 ||
        summary.tooLarge > 0) {
      logger.info("Programme count recount completed", {
        ...summary, changes: summary.changes.slice(0, 20),
      });
    }
  }
);
