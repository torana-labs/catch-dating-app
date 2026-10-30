import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_communication_plan.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_revenue.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_send.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_timeline.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'preview.dart';
import 'shell_fixture.dart';

@widgetbook.UseCase(
  name: 'Route and component states',
  type: HostCustomersScreen,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomersStates(
  BuildContext context, {
  Widget Function(HostAudienceContactDetail customer)? detailBuilder,
}) {
  final organizerId = HostOperationsFixtures.primaryOrganizer.id;
  const contactId = 'design-customer-ananya';
  final contact = HostAudienceContact(
    contactId: contactId,
    displayName: 'Ananya Rao',
    phoneE164: '+919876543210',
    email: 'ananya@example.com',
    identityState: HostAudienceIdentityState.verified,
    identityConfidence: 'verified_account',
    ambiguousCandidateCount: 0,
    attendedEventCount: 8,
    expectedEventCount: 9,
    lastAttendedAt: DateTime(2030, 6, 18, 18, 30),
    segments: const {
      HostAudienceSegment.repeatAttendee,
      HostAudienceSegment.regular,
      HostAudienceSegment.reliableAttendee,
    },
    manualTags: const [
      HostManualTag(
        tagId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        label: 'Brings friends',
      ),
    ],
    whatsappStatus: HostAudiencePermissionStatus.optedIn,
    whatsappAdminSuppressed: false,
    smsStatus: HostAudiencePermissionStatus.unknown,
    sourceCoverage: HostAudienceSourceCoverage.exact,
    revision: 3,
  );
  final directoryRequest = HostCustomersDirectoryRequest(
    organizerId: organizerId,
  );
  final directoryState = HostCustomersDirectoryState(
    contacts: [
      HostCustomerDirectoryContact(
        contactId: contact.contactId,
        displayName: contact.displayName,
        attendedEventCount: contact.attendedEventCount,
        lastAttendedAt: contact.lastAttendedAt,
        tags: const {HostCustomerTag.repeat, HostCustomerTag.regular},
        manualTags: const [
          HostCustomerManualTag(
            tagId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            label: 'Brings friends',
          ),
        ],
        hasAmbiguousIdentity: false,
        whatsappOptedIn: true,
        whatsappAdminSuppressed: false,
      ),
    ],
    nextCursor: null,
    matchCount: 1,
    matchCountCoverage: HostCustomerMatchCountCoverage.exact,
    manualTagVocabulary: const [
      HostCustomerManualTag(
        tagId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        label: 'Brings friends',
      ),
      HostCustomerManualTag(
        tagId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        label: 'Prefers weekends',
      ),
    ],
    sourceCoverage: HostCustomerDirectoryCoverage.exact,
    projectionVersion: 1,
  );
  final detail = HostAudienceContactDetail(
    organizerId: organizerId,
    contactId: contactId,
    displayName: contact.displayName,
    sourceDisplayName: contact.displayName,
    displayNameOverride: null,
    phoneE164: contact.phoneE164,
    email: contact.email,
    linkedAccount: true,
    identityState: HostAudienceIdentityState.verified,
    identityConfidence: 'verified_account',
    ambiguousCandidateCount: 0,
    whatsappAdminSuppressed: false,
    whatsappPermission: HostCustomerWhatsappPermission(
      status: HostAudiencePermissionStatus.optedIn,
      evidenceStatus: HostCustomerPermissionEvidenceStatus.complete,
      receiptId: 'design-permission-receipt',
      source: 'hostFormResponse',
      sourceFormId: 'design-form-1',
      sourceFormTitle: 'Sunday Run sign-up',
      decisionAt: DateTime(2030, 4, 30),
      identityStrength: 'catchAccount',
    ),
    origins: [
      HostCustomerOrigin(
        originId: 'design-origin-1',
        sourceKind: HostCustomerOriginSourceKind.hostForm,
        sourceEntityKind: 'hostFormResponse',
        formId: 'design-form-1',
        formTitle: 'Sunday Run sign-up',
        eventId: 'design-customer-event-2',
        eventTitle: 'Monsoon Mixer',
        observedAt: DateTime(2030, 4, 30),
      ),
      HostCustomerOrigin(
        originId: 'design-origin-2',
        sourceKind: HostCustomerOriginSourceKind.catchBooking,
        sourceEntityKind: 'eventAttendee',
        formId: null,
        formTitle: null,
        eventId: 'design-customer-event-1',
        eventTitle: 'Sunday Run Club',
        observedAt: DateTime(2030, 6, 18),
      ),
    ],
    originsTruncated: false,
    traits: const HostCustomerTraits(
      expectedEventCount: 9,
      attendedEventCount: 8,
      cancelledEventCount: 1,
      noShowCount: 0,
      importedEventCount: 0,
      attendanceRate: 8 / 9,
      segments: {
        HostAudienceSegment.repeatAttendee,
        HostAudienceSegment.regular,
        HostAudienceSegment.reliableAttendee,
      },
      whatsappStatus: HostAudiencePermissionStatus.optedIn,
      sourceCoverage: HostAudienceSourceCoverage.exact,
    ),
    revenue: const HostCustomerRevenue(
      coverage: HostCustomerRevenueCoverage.exact,
      amounts: [
        HostCustomerRevenueAmount(
          currency: 'INR',
          amountMinor: 184500,
          paidOrderCount: 7,
        ),
      ],
    ),
    events: [
      HostAudienceEventFact(
        eventId: 'design-customer-event-1',
        displayName: 'Sunday Run Club',
        source: 'catch',
        status: 'checked_in',
        checkedIn: true,
        eventStartAt: DateTime(2030, 6, 18, 18, 30),
      ),
      HostAudienceEventFact(
        eventId: 'design-customer-event-2',
        displayName: 'Monsoon Mixer',
        source: 'catch',
        status: 'checked_in',
        checkedIn: true,
        eventStartAt: DateTime(2030, 5, 21, 19),
      ),
    ],
    eventsTruncated: false,
    manualTags: const [
      HostManualTag(
        tagId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        label: 'Brings friends',
      ),
    ],
    manualTagVocabulary: const [
      HostManualTag(
        tagId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        label: 'Brings friends',
      ),
      HostManualTag(
        tagId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        label: 'Prefers weekends',
      ),
    ],
    notes: [
      HostCustomerNote(
        noteId: 'design-note-1',
        body: 'Introduced three friends and prefers smaller weekend events.',
        authorUid: HostOperationsFixtures.hostUid,
        createdAt: DateTime(2030, 6, 19, 10),
        updatedAt: DateTime(2030, 6, 19, 10),
        revision: 1,
      ),
    ],
    notesTruncated: false,
    sends: [
      HostCustomerSend(
        campaignId: 'design-campaign-1',
        name: 'June member invite',
        messageClass: 'organizerPromotion',
        deliveryStatus: HostCustomerSendDeliveryStatus.delivered,
        createdAt: DateTime(2030, 6, 17, 9),
        sentAt: DateTime(2030, 6, 17, 9, 5),
        updatedAt: DateTime(2030, 6, 17, 9, 6),
      ),
    ],
    sendsTruncated: false,
    timeline: [
      HostCustomerReplyTimelineEntry(
        timelineId: 'design-reply-1',
        occurredAt: DateTime(2030, 6, 19, 12),
        transport: HostCustomerReplyTransport.catchChat,
        direction: HostWhatsappMessageDirection.inbound,
        bodyPreview: 'I’ll bring two friends next Sunday.',
        threadId: 'design-match-1',
      ),
      HostCustomerEventTimelineEntry(
        timelineId: 'design-event-1',
        occurredAt: DateTime(2030, 6, 18, 18, 30),
        eventId: 'design-customer-event-1',
        eventName: 'Sunday Run Club',
        status: 'checkedIn',
        checkedIn: true,
        eventOrigin: HostCustomerEventOrigin.catchNative,
        eventProvider: 'catch',
      ),
      HostCustomerSendTimelineEntry(
        timelineId: 'design-send-1',
        occurredAt: DateTime(2030, 6, 17, 9, 6),
        sendKind: HostCustomerTimelineSendKind.campaign,
        name: 'June member invite',
        status: 'delivered',
        deliveryMode: HostCustomerTimelineDeliveryMode.api,
        observation: HostCustomerTimelineObservation.providerReceipt,
        referenceId: 'design-campaign-1',
      ),
      HostCustomerFormTimelineEntry(
        timelineId: 'design-form-1',
        occurredAt: DateTime(2030, 4, 30),
        responseId: 'design-response-1',
        formId: 'design-form-1',
        formTitle: 'Sunday Run sign-up',
        action: HostCustomerFormTimelineAction.submitted,
        answeredQuestionCount: 5,
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
    revision: 3,
  );
  final communicationPlan = HostCommunicationPlan(
    organizerId: organizerId,
    intent: HostCommunicationIntent.individualConversation,
    capabilityVersion: 1,
    resolvedAt: DateTime(2030, 6, 20),
    recipients: const [
      HostCommunicationRecipientPlan(
        contactId: contactId,
        displayName: 'Ananya Rao',
        outcome: HostCommunicationOutcome.inCatch,
        recommendedRouteId: HostCommunicationRouteId.catchChat,
        routes: [
          HostCommunicationRouteOption(
            routeId: HostCommunicationRouteId.catchChat,
            executionMode: HostCommunicationExecutionMode.managedDelivery,
            availability: HostCommunicationRouteAvailability.available,
            blocker: null,
          ),
          HostCommunicationRouteOption(
            routeId: HostCommunicationRouteId.personalWhatsappHandoff,
            executionMode: HostCommunicationExecutionMode.externalHandoff,
            availability: HostCommunicationRouteAvailability.available,
            blocker: null,
          ),
        ],
      ),
    ],
  );
  if (detailBuilder != null) {
    final application = HostApplicationDetail(
      organizerId: organizerId,
      applicationId: 'design-application-1',
      formId: 'design-form-1',
      formVersionId: 'design-form-version-1',
      targetKind: 'organizer',
      targetId: null,
      applicantDisplayName: contact.displayName,
      reviewStatus: HostApplicationReviewStatus.approved,
      answers: const [
        HostApplicationAnswer(
          questionId: 'interests',
          questionKey: 'interests',
          questionLabel: 'What would you like to join?',
          questionKind: 'text',
          canonicalFieldId: null,
          privacyClass: 'organizer',
          hostPresentation: 'text',
          value: HostApplicationAnswerValue(
            valueKind: 'text',
            textValue: 'Smaller weekend events and running groups.',
            numberValue: null,
            booleanValue: null,
            dateValue: null,
            optionValues: [],
            assetIds: [],
          ),
        ),
      ],
      outreach: const HostApplicationOutreach(
        phoneE164: '+919876543210',
        email: 'ananya@example.com',
        instagramUrl: 'https://www.instagram.com/ananya.example/',
        linkedinUrl: null,
      ),
      reviewNote: null,
      assignedReviewerUid: null,
      submittedAt: DateTime(2030, 4, 30),
      reviewedAt: DateTime(2030, 5, 1),
      revision: 2,
      contactId: contactId,
      sourceResponseId: 'design-response-1',
      dataAccessState: 'submittedFormResponse',
    );
    return WidgetbookPageCatalogFrame(
      title: 'Customer detail components',
      contractId: 'screen.host.customer_detail',
      children: [
        WidgetbookPageStateCard(
          label: 'populated customer record',
          child: WidgetbookHostDeviceFrame(
            child: WidgetbookFixtureScope(
              overrides: [
                hostApplicationDetailProvider(
                  organizerId,
                  application.applicationId,
                ).overrideWithValue(AsyncData(application)),
                hostApplicationsDirectoryControllerProvider(
                  HostApplicationListRequest(
                    organizerId: organizerId,
                    contactId: contactId,
                  ),
                ).overrideWithBuild(
                  (ref, notifier) async => HostApplicationsDirectoryState(
                    applications: [
                      HostApplicationSummary(
                        applicationId: application.applicationId,
                        formId: application.formId,
                        formVersionId: application.formVersionId,
                        targetKind: application.targetKind,
                        targetId: application.targetId,
                        applicantDisplayName: application.applicantDisplayName,
                        reviewStatus: application.reviewStatus,
                        sourceKind: HostApplicationSourceKind.native,
                        providerId: null,
                        submittedAt: application.submittedAt,
                        revision: application.revision,
                      ),
                    ],
                    nextCursor: null,
                  ),
                ),
              ],
              child: Scaffold(
                body: SingleChildScrollView(
                  padding: CatchInsets.pageBody,
                  child: detailBuilder(detail),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
  return WidgetbookPageCatalogFrame(
    title: 'Host Customers',
    contractId: 'screen.host.customers',
    children: [
      WidgetbookPageStateCard(
        label: 'populated directory',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: WidgetbookFixtureScope(
              overrides: [
                hostCustomersDirectoryControllerProvider(
                  directoryRequest,
                ).overrideWithBuild((ref, notifier) async => directoryState),
              ],
              child: HostCustomersScreen(initialOrganizerId: organizerId),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'full-page add customer',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: HostAddCustomerScreen(organizerId: organizerId),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'linked customer detail',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: WidgetbookFixtureScope(
              overrides: [
                hostAudienceContactDetailProvider(
                  organizerId,
                  contactId,
                ).overrideWithValue(AsyncData(detail)),
                hostCommunicationPlanProvider(
                  organizerId,
                  contactId,
                ).overrideWithValue(AsyncData(communicationPlan)),
              ],
              child: HostCustomerDetailScreen(
                organizerId: organizerId,
                contactId: contactId,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'detail composition',
        child: WidgetbookHostDeviceFrame(
          child: HostCustomerDetailBody(
            customer: detail,
            currentUid: HostOperationsFixtures.hostUid,
            communicationPlan: communicationPlan,
            communicationPlanLoading: false,
            communicationPlanFailed: false,
            openingConversation: false,
            updatingCustomer: false,
            onSaveDetails: ({required displayName, phoneE164, email}) async {},
            onEditTags: () {},
            onAddNote: () {},
            onEditNote: (_) {},
            onReviewDuplicates: () {},
            onMessage: () {},
            onRetryCommunicationPlan: () {},
            onMessagingEnabledChanged: (_) {},
            onOpenFormResponse: (_) {},
            onOpenEvent: (_) {},
            onOpenCatchThread: (_) {},
            onOpenWhatsappThread: (_) {},
            onCall: () {},
            onEmail: () {},
            onOpenApplication: (_) {},
            onOpenContact: (_) {},
            onOpenRevenue: () {},
            onUndoMerge: (_) {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'inline edit linked customer details',
        child: WidgetbookHostDeviceFrame(
          child: Scaffold(
            body: HostCustomerIdentityCard(
              customer: detail,
              initiallyEditing: true,
              onSave: ({required displayName, phoneE164, email}) async {},
            ),
          ),
        ),
      ),
    ],
  );
}
