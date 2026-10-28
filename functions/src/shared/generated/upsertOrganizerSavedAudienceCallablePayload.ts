/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Creates or revision-updates one reusable Customers-owned CRM audience.
 */
export interface UpsertOrganizerSavedAudienceCallablePayload {
  organizerId: string;
  audienceId?: string | null;
  requestId: string;
  expectedRevision?: number | null;
  scope: "organizerCrm";
  name: string;
  definition: {
    join: "all" | "any";
    /**
     * @minItems 1
     * @maxItems 8
     */
    predicates: (
      | {
          kind: "computedSegment";
          segmentId:
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
            | "frequent_non_member";
        }
      | {
          kind: "manualTag";
          manualTagId: string;
        }
      | {
          kind: "attendanceCount";
          operator: "atLeast" | "atMost";
          eventCount: number;
        }
      | {
          kind: "lastSeenWithinDays";
          days: number;
        }
      | {
          kind: "reachableForIntent";
          intent: "organizerWhatsappCampaign";
        }
      | {
          kind: "applicationStatus";
          formId: string;
          reviewStatus:
            | "submitted"
            | "inReview"
            | "approved"
            | "waitlisted"
            | "declined";
        }
      | {
          kind: "formAnswer";
          formId: string;
          versionId: string;
          questionId: string;
          value: string | boolean;
        }
      | {
          kind: "attendedEvent";
          eventId: string;
        }
      | {
          kind: "spend";
          operator: "atLeast" | "atMost";
          currency: string;
          amountMinor: number;
          withinDays: number | null;
        }
      | {
          kind: "staticMembers";
          /**
           * @minItems 0
           * @maxItems 2500
           */
          contactIds: string[];
        }
      | {
          kind: "directoryFilters";
          /**
           * @maxItems 12
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
          /**
           * @maxItems 20
           */
          manualTagIds: string[];
        }
    )[];
  };
}
