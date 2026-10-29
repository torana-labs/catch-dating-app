import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_revenue.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_send.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_timeline.dart';

HostAudienceContactDetail hostCustomerSkeletonDetail({
  required String organizerId,
  required String contactId,
  required String displayName,
  required String manualTagLabel,
  required String noteBody,
}) {
  final now = DateTime(2026, 8, 17);
  return HostAudienceContactDetail(
    organizerId: organizerId,
    contactId: contactId,
    displayName: displayName,
    sourceDisplayName: displayName,
    displayNameOverride: null,
    phoneE164: '+919876543210',
    email: 'customer@example.com',
    linkedAccount: false,
    identityState: HostAudienceIdentityState.unlinked,
    identityConfidence: 'unverified',
    contactDetailsEditable: true,
    ambiguousCandidateCount: 0,
    whatsappAdminSuppressed: false,
    whatsappPermission: HostCustomerWhatsappPermission(
      status: HostAudiencePermissionStatus.optedIn,
      evidenceStatus: HostCustomerPermissionEvidenceStatus.complete,
      receiptId: 'loading-receipt',
      source: 'hostFormResponse',
      sourceFormId: 'loading-form',
      sourceFormTitle: 'Community sign-up',
      decisionAt: now,
      identityStrength: 'phoneVerified',
    ),
    origins: [
      HostCustomerOrigin(
        originId: 'loading-origin',
        sourceKind: HostCustomerOriginSourceKind.hostForm,
        sourceEntityKind: 'hostFormResponse',
        formId: 'loading-form',
        formTitle: 'Community sign-up',
        eventId: null,
        eventTitle: null,
        observedAt: now,
      ),
    ],
    originsTruncated: false,
    traits: const HostCustomerTraits(
      expectedEventCount: 3,
      attendedEventCount: 2,
      cancelledEventCount: 0,
      noShowCount: 0,
      importedEventCount: 0,
      attendanceRate: 0.67,
      segments: {HostAudienceSegment.repeatAttendee},
      whatsappStatus: HostAudiencePermissionStatus.optedIn,
      sourceCoverage: HostAudienceSourceCoverage.exact,
    ),
    revenue: const HostCustomerRevenue(
      coverage: HostCustomerRevenueCoverage.exact,
      amounts: [
        HostCustomerRevenueAmount(
          currency: 'INR',
          amountMinor: 250000,
          paidOrderCount: 2,
        ),
      ],
    ),
    events: [
      HostAudienceEventFact(
        eventId: 'loading-event',
        displayName: 'Weekend community event',
        source: 'attendance',
        status: 'attended',
        checkedIn: true,
        eventStartAt: now,
      ),
    ],
    eventsTruncated: false,
    manualTags: [HostManualTag(tagId: 'loading-tag', label: manualTagLabel)],
    notes: [
      HostCustomerNote(
        noteId: 'loading-note',
        body: noteBody,
        authorUid: 'loading-author',
        createdAt: now,
        updatedAt: now,
        revision: 1,
      ),
    ],
    sends: [
      HostCustomerSend(
        campaignId: 'loading-send',
        name: 'Upcoming event invitation',
        messageClass: 'organizerPromotion',
        deliveryStatus: HostCustomerSendDeliveryStatus.delivered,
        createdAt: now,
        sentAt: now,
        updatedAt: now,
      ),
    ],
    timeline: [
      HostCustomerFormTimelineEntry(
        timelineId: 'loading-timeline-form',
        occurredAt: now,
        responseId: 'loading-response',
        formId: 'loading-form',
        formTitle: 'Community sign-up',
        action: HostCustomerFormTimelineAction.submitted,
        answeredQuestionCount: 4,
      ),
    ],
    timelineTruncated: false,
    timelineCoverage: const HostCustomerTimelineCoverage(
      forms: HostCustomerTimelineCoverageValue.exact,
      events: HostCustomerTimelineCoverageValue.exact,
      sends: HostCustomerTimelineCoverageValue.exact,
      replies: HostCustomerTimelineCoverageValue.partial,
      outreach: HostCustomerTimelineCoverageValue.exact,
    ),
    revision: 1,
  );
}
