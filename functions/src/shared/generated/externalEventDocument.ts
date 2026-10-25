/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {OrganizerSupplyCapabilities} from "./organizerSupplyCapabilities";
import type {ExternalEventBlockerResolution} from "./externalEventBlockerResolution";

/**
 * Read-only external event document stored at externalEvents/{eventId}. These records are sourced from events Supply Intake imported for a published organizer and may link to external booking platforms, but they never enable Catch booking, payments, reservations, waitlists, attendance, or schedule locks.
 */
export interface ExternalEventDocument {
  schemaVersion: 1;
  eventId: string;
  canonicalHostId: string;
  compatibilityClubId: string;
  title: string;
  description: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  startTime: {
    _seconds: number;
    _nanoseconds: number;
  };
  endTime: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
  timezone: string | null;
  meetingPoint: string;
  meetingLocation: {
    name: string;
    address: string | null;
    placeId: string | null;
    latitude: number | null;
    longitude: number | null;
    notes: string | null;
  };
  locationDetails: string | null;
  photoUrl: string | null;
  activity: {
    version: 1;
    activityKind:
      | "socialRun"
      | "running"
      | "walking"
      | "pickleball"
      | "padel"
      | "tennis"
      | "badminton"
      | "cycling"
      | "spinClass"
      | "yoga"
      | "strengthTraining"
      | "pubQuiz"
      | "barCrawl"
      | "dinner"
      | "singlesMixer"
      | "openActivity";
    interactionModel:
      | "pacePods"
      | "pairedRotations"
      | "teamRotations"
      | "seatedTable"
      | "freeFormMixer"
      | "hostLedProgram"
      | "openFormat";
    source: "heuristic" | "admin" | "source";
  };
  price: {
    displayText: string | null;
    parsedPriceInPaise: number | null;
    currency: string;
  };
  status: "active" | "cancelled";
  publicationStatus: "draft" | "public" | "archived" | "removed";
  organizerCapabilities: OrganizerSupplyCapabilities;
  booking: {
    mode: "external_outbound_only";
    catchBookingEnabled: false;
    catchPaymentsEnabled: false;
    catchReservationsEnabled: false;
    catchWaitlistEnabled: false;
    /**
     * @minItems 1
     * @maxItems 12
     */
    externalLinks: {
      platform: "bookMyShow" | "district" | "luma" | "partiful" | "sortMyScene";
      url: string;
      linkType: "booking_or_event_page" | "source_surface";
      sourceEventKey: string;
      candidateId: string;
      primary: boolean;
    }[];
  };
  discovery: {
    citySlug: (string | null) | null;
    countryCode: string | null;
    availability: "read_only_external";
    manualApprovalRequired: true;
    /**
     * The attributed organizer's app visibility, copied at publication and kept in step when it changes, so app discovery never shows an event whose organizer is hidden in the app. The website applies the organizer's page and search controls itself.
     */
    appVisibility: "hidden" | "discoverable";
  };
  dedupe: {
    normalizedEventKey: string;
    primaryCandidateId: string;
    /**
     * @maxItems 24
     */
    duplicateCandidateIds: string[];
    conflictPolicy: "single_read_only_event_with_multiple_outbound_links";
  };
  externalSource: {
    candidateId: string;
    sourceEventKey: string;
    sourceEventId: string;
    platform: "bookMyShow" | "district" | "luma" | "partiful" | "sortMyScene";
    eventUrl: string | null;
    sourceUrl: string | null;
  };
  review: {
    eventReviewBatchId: string | null;
    reviewer: string | null;
    decidedAt: string | null;
    note: string | null;
    importPolicyAcknowledged: boolean;
    ownerSafeCopyReviewed: boolean;
    /**
     * @maxItems 6
     */
    blockerResolutions: ExternalEventBlockerResolution[];
  };
  takedown?: {
    /**
     * Serialized Firestore Timestamp fixture shape.
     */
    removedAt: {
      _seconds: number;
      _nanoseconds: number;
    };
    removedByUid: string;
    reason: string;
    receiptId: string;
  } | null;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}
