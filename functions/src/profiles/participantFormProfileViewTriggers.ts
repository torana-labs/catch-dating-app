import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileParticipantFormProfileView,
  reconcileParticipantIntakeProfileView, responseWriteChangesReview} from
  "./participantFormProfileViewStore";

const options = {retry: true};

/** A proposal's creation, claim or deletion changes its review row. */
export const onParticipantFormProfileViewProposalChanged = onDocumentWritten(
  {...options, document: "participantFormProfileProposals/{responseId}"},
  (event) => reconcileParticipantFormProfileView(admin.firestore(),
    event.params.responseId));

/** Withdrawal or a status change makes a response's review unavailable. */
export const onParticipantFormProfileViewResponseChanged = onDocumentWritten(
  {...options, document: "organizerFormResponses/{responseId}"},
  async (event) => {
    if (!responseWriteChangesReview(event.data?.before.data(),
      event.data?.after.data())) return;
    await reconcileParticipantFormProfileView(admin.firestore(),
      event.params.responseId);
  });

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
