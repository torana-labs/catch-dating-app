/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Manager-only contact facts, permission provenance, and a bounded cross-surface activity timeline. Private feedback and Event Success inputs are excluded.
 */
export interface GetOrganizerContactDetailCallableResponse {
  /**
   * False means operational history was deliberately not requested; empty history arrays are not evidence of no activity.
   */
  historyLoaded?: boolean;
  organizerId: string;
  contactId: string;
  displayName: string;
  sourceDisplayName: string;
  displayNameOverride: string | null;
  phoneE164: string | null;
  email: string | null;
  linkedAccount: boolean;
  identityState: "unlinked" | "verified" | "ambiguous";
  identityConfidence: "eventOnly" | "proposed" | "verified";
  /**
   * True only for an unlinked organizer-created contact whose proposed phone/email evidence the manager may edit.
   */
  contactDetailsEditable?: boolean;
  /**
   * @maxItems 20
   */
  ambiguousCandidateContactIds: string[];
  whatsappAdminSuppressed: boolean;
  whatsappPermission: {
    status: "unknown" | "optedIn" | "optedOut";
    evidenceStatus: "unavailable" | "notApplicable" | "complete" | "incomplete";
    receiptId: string | null;
    source:
      | null
      | "publicEventRegistration"
      | "hostFormResponse"
      | "participantSettings"
      | "unsubscribeLink"
      | "inboundStop"
      | "providerWebhook"
      | "legacyIncomplete";
    sourceFormId: string | null;
    sourceFormTitle: string | null;
    decisionAtMillis: number | null;
    identityStrength:
      | null
      | "unknown"
      | "emailVerified"
      | "phoneVerified"
      | "catchAccount";
    purposes?: {
      eventOperations?: {
        status: "unknown" | "optedIn" | "optedOut";
        evidenceStatus: "complete" | "incomplete";
        receiptId: string | null;
        decisionAtMillis: number | null;
        /**
         * False for form-originated WhatsApp purposes pending provider review; consent can still be recorded.
         */
        deliveryAvailable: boolean;
      };
      marketing?: {
        status: "unknown" | "optedIn" | "optedOut";
        evidenceStatus: "complete" | "incomplete";
        receiptId: string | null;
        decisionAtMillis: number | null;
        /**
         * False for form-originated WhatsApp purposes pending provider review; consent can still be recorded.
         */
        deliveryAvailable: boolean;
      };
    };
  };
  /**
   * @maxItems 50
   */
  origins: {
    originId: string;
    sourceKind:
      | "catchBooking"
      | "hostImport"
      | "hostManual"
      | "webOtp"
      | "providerSync"
      | "hostForm";
    sourceEntityKind:
      | "eventAttendee"
      | "manualEntry"
      | "hostFormResponse"
      | "providerRecord"
      | "importBatch"
      | "webRegistration"
      | "hostApplicationResponse";
    formId: string | null;
    formTitle: string | null;
    eventId: string | null;
    eventTitle: string | null;
    observedAtMillis: number;
  }[];
  originsTruncated: boolean;
  traits: {
    expectedEventCount: number;
    attendedEventCount: number;
    cancelledEventCount: number;
    noShowCount: number;
    importedEventCount: number;
    attendanceRate: number | null;
    /**
     * @maxItems 16
     */
    segmentIds: (
      | "new_to_organizer"
      | "past_attendee"
      | "first_time_attendee"
      | "repeat_attendee"
      | "regular"
      | "lapsed_regular"
      | "reliable_attendee"
      | "needs_confirmation"
      | "advocate"
      | "high_impact_advocate"
      | "whatsapp_reachable"
      | "sms_reachable"
      | "active_member"
      | "lapsed_member"
      | "member_no_recent_attendance"
      | "frequent_non_member"
    )[];
    whatsappStatus: "unknown" | "optedIn" | "optedOut";
    smsStatus: "unknown" | "optedIn" | "optedOut";
    sourceCoverage: "exact" | "partial" | "insufficientData";
    /**
     * CRM projection of one contact's paid membership with the organizer, through the contact's linked account.
     */
    membership?: {
      planId: string;
      planName: string;
      status:
        | "trialing"
        | "active"
        | "past_due"
        | "paused"
        | "canceling"
        | "expired";
      memberSinceMillis: number | null;
      entitled: boolean;
    } | null;
  };
  revenue: {
    coverage: "exact" | "partial" | "unavailable";
    /**
     * @maxItems 8
     */
    amounts: {
      currency: string;
      amountMinor: number;
      factCount: number;
      /**
       * @maxItems 4
       */
      sources: {
        source:
          | "catchPayment"
          | "hostImport"
          | "hostEstimate"
          | "providerOrder"
          | "hostAttested";
        amountMinor: number;
        factCount: number;
      }[];
    }[];
  };
  /**
   * @maxItems 100
   */
  events: {
    eventId: string;
    attendeeId: string;
    displayName: string;
    eventOriginMode: "catchNative" | "externalCompanion" | "unknown";
    eventProvider:
      | "catch"
      | "generic"
      | "luma"
      | "eventbrite"
      | "partiful"
      | "posh"
      | "bookmyshow"
      | "district"
      | "sortmyscene"
      | "airbnb"
      | null;
    source:
      | "catchBooking"
      | "hostImport"
      | "hostManual"
      | "webOtp"
      | "providerSync";
    status: "invited" | "registered" | "waitlisted" | "checkedIn" | "cancelled";
    expected: boolean;
    registered: boolean;
    cancelled: boolean;
    checkedIn: boolean;
    eventStartAtMillis: number | null;
    eventEndAtMillis: number | null;
    registeredAtMillis: number | null;
    cancelledAtMillis: number | null;
    checkedInAtMillis: number | null;
    /**
     * @maxItems 8
     */
    revenues: {
      currency: string;
      amountMinor: number;
      source:
        | "catchPayment"
        | "hostImport"
        | "hostEstimate"
        | "providerOrder"
        | "hostAttested";
      factCount: number;
      allocation: "perAttendee" | "sharedOrder";
    }[];
  }[];
  eventsTruncated: boolean;
  /**
   * @maxItems 5
   */
  manualTags?: {
    tagId: string;
    label: string;
  }[];
  /**
   * @maxItems 20
   */
  manualTagVocabulary?: {
    tagId: string;
    label: string;
  }[];
  /**
   * @maxItems 100
   */
  notes?: {
    noteId: string;
    body: string;
    authorUid: string;
    createdAtMillis: number;
    updatedAtMillis: number;
    revision: number;
  }[];
  notesTruncated?: boolean;
  notesCoverage?: "exact" | "unavailable";
  /**
   * @maxItems 100
   */
  sends?: (
    | {
        kind: "campaign";
        campaignId: string;
        name: string;
        messageClass:
          | "eventFollowUp"
          | "organizerUpdate"
          | "organizerPromotion";
        deliveryStatus:
          | "pending"
          | "sending"
          | "suppressed"
          | "accepted"
          | "sent"
          | "delivered"
          | "read"
          | "failed"
          | "replied"
          | "optedOut";
        createdAtMillis: number;
        sentAtMillis: number | null;
        updatedAtMillis: number;
      }
    | {
        kind: "announcement";
        broadcastId: string;
        eventId: string;
        eventName: string;
        audience: "booked" | "prospective" | "everyone";
        deliveryStatus: "available" | "failed";
        sentAtMillis: number;
        partialFailure: boolean;
      }
  )[];
  sendsTruncated?: boolean;
  sendsCoverage?: "exact" | "unavailable";
  /**
   * @maxItems 100
   */
  timeline: (
    | {
        kind: "form";
        timelineId: string;
        responseId: string;
        formId: string;
        formTitle: string | null;
        action: "submitted" | "withdrawn";
        answeredQuestionCount: number;
        occurredAtMillis: number;
      }
    | {
        kind: "event";
        timelineId: string;
        eventId: string;
        eventName: string;
        status:
          | "invited"
          | "registered"
          | "waitlisted"
          | "checkedIn"
          | "cancelled";
        checkedIn: boolean;
        eventOriginMode: "catchNative" | "externalCompanion" | "unknown";
        eventProvider:
          | "catch"
          | "generic"
          | "luma"
          | "eventbrite"
          | "partiful"
          | "posh"
          | "bookmyshow"
          | "district"
          | "sortmyscene"
          | "airbnb"
          | null;
        occurredAtMillis: number;
      }
    | {
        kind: "send";
        timelineId: string;
        sendKind: "campaign" | "announcement" | "manualHandoff";
        name: string;
        status:
          | "available"
          | "pending"
          | "sending"
          | "suppressed"
          | "accepted"
          | "sent"
          | "delivered"
          | "read"
          | "failed"
          | "replied"
          | "optedOut"
          | "queued"
          | "handoffOpened"
          | "hostMarkedSent"
          | "skipped"
          | "cancelled"
          | "superseded"
          | "expired";
        deliveryMode: "inCatch" | "api" | "byHand";
        observation:
          | "providerReceipt"
          | "catchActivity"
          | "hostOpened"
          | "hostAssertion"
          | "notSent";
        referenceId: string;
        occurredAtMillis: number;
      }
    | {
        kind: "reply";
        timelineId: string;
        transport: "catchChat" | "managedWhatsapp";
        direction: "inbound" | "outbound";
        bodyPreview: string;
        threadId: string;
        occurredAtMillis: number;
      }
    | {
        kind: "outreach";
        timelineId: string;
        channel:
          | "phoneCall"
          | "whatsapp"
          | "email"
          | "sms"
          | "inPerson"
          | "other";
        outcome:
          | "reached"
          | "noAnswer"
          | "leftMessage"
          | "wrongContact"
          | "attempted";
        notePreview: string | null;
        occurredAtMillis: number;
      }
  )[];
  timelineTruncated: boolean;
  timelineCoverage: {
    forms: "exact" | "partial" | "unavailable";
    events: "exact" | "partial" | "unavailable";
    sends: "exact" | "partial" | "unavailable";
    replies: "exact" | "partial" | "unavailable";
    outreach: "exact" | "partial" | "unavailable";
    replyObservation: "catchAndManagedWhatsappOnly";
  };
  /**
   * @maxItems 50
   */
  activeMerges: {
    mergeReceiptId: string;
    sourceContactId: string;
    sourceDisplayName: string;
    /**
     * @maxItems 20
     */
    evidence: (
      | "sameVerifiedUid"
      | "sameVerifiedPhone"
      | "sameImportedPhone"
      | "sameEmail"
      | "managerConfirmed"
    )[];
    /**
     * @maxItems 20
     */
    conflicts: string[];
    movedFactCount: number;
    mergedAtMillis: number;
  }[];
  revision: number;
}
