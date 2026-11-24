import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileParticipantFormProfileView,
  reconcileParticipantIntakeProfileView, responseWriteChangesReview} from
  "./participantFormProfileViewStore";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true};

/** A proposal's creation, claim or deletion changes its review row. */
export const onParticipantFormProfileViewProposalChanged = onDocumentWritten(
  {...options, document: "participantFormProfileProposals/{responseId}"},
  (event) => reconcileParticipantFormProfileView(admin.firestore(),
    event.params.responseId));

/** A claim's organizer-card choice changes the row's card selection. */
export const onParticipantFormProfileViewCardChanged = onDocumentWritten(
  {...options, document: "participantOrganizerCards/{responseId}"},
  (event) => reconcileParticipantFormProfileView(admin.firestore(),
    event.params.responseId));

/** The intake view follows the guest's portable intake profile. */
export const onParticipantIntakeProfileViewChanged = onDocumentWritten(
  {...options, document: "participantIntakeProfiles/{uid}"},
  (event) => reconcileParticipantIntakeProfileView(admin.firestore(),
    event.params.uid));

/**
 * Dispatcher specs (issue #2451). Each body re-reads its sources, so a
 * retry or a replay converges.
 */
export const organizerFormResponsesProjections = defineProjections(
  "organizerFormResponses", [
    {
      id: "participantFormProfileViewResponseChanged", kind: "projection",
      when: () => true,
      run: async (change) => {
        const {before, after, documentId} = change;
        if (!responseWriteChangesReview(before,
          after)) return;
        await reconcileParticipantFormProfileView(admin.firestore(),
          documentId);
      },
    },
  ]);
