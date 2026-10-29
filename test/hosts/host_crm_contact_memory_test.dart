import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_send.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_timeline.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('new scoped grant is active after an older sender STOP', () {
    final permission = HostCustomerWhatsappPermission.fromMap({
      'status': 'optedOut',
      'evidenceStatus': 'complete',
      'receiptId': 'old-stop',
      'source': 'inboundStop',
      'sourceFormId': null,
      'sourceFormTitle': null,
      'decisionAtMillis': 1000,
      'identityStrength': 'phoneVerified',
      'purposes': {
        'eventOperations': {
          'status': 'optedIn',
          'evidenceStatus': 'complete',
          'receiptId': 'new-grant',
          'decisionAtMillis': 2000,
          'deliveryAvailable': false,
        },
      },
    });
    expect(permission.effectiveStatus.name, 'optedIn');
  });
  test(
    'contact detail parses memory and typed campaign/announcement sends',
    () {
      final detail = HostAudienceContactDetail.fromCallableData({
        'organizerId': 'organizer-1',
        'contactId': 'contact-1',
        'displayName': 'Ananya Rao',
        'sourceDisplayName': 'Ananya Rao',
        'displayNameOverride': null,
        'phoneE164': null,
        'email': null,
        'linkedAccount': true,
        'identityState': 'verified',
        'identityConfidence': 'verified',
        'ambiguousCandidateContactIds': <Object?>[],
        'whatsappAdminSuppressed': false,
        'whatsappPermission': {
          'status': 'optedIn',
          'evidenceStatus': 'complete',
          'receiptId': 'permission-1',
          'source': 'hostFormResponse',
          'sourceFormId': 'form-1',
          'sourceFormTitle': 'Friday run sign-up',
          'decisionAtMillis': 1000,
          'identityStrength': 'phoneVerified',
          'purposes': {
            'eventOperations': {
              'status': 'optedIn',
              'evidenceStatus': 'complete',
              'receiptId': 'operations-receipt',
              'decisionAtMillis': 1000,
              'deliveryAvailable': false,
            },
            'marketing': {
              'status': 'optedOut',
              'evidenceStatus': 'complete',
              'receiptId': 'marketing-receipt',
              'decisionAtMillis': 2000,
              'deliveryAvailable': false,
            },
          },
        },
        'origins': <Object?>[
          {
            'originId': 'origin-1',
            'sourceKind': 'hostForm',
            'sourceEntityKind': 'hostFormResponse',
            'formId': 'form-1',
            'formTitle': 'Friday run sign-up',
            'eventId': 'event-1',
            'eventTitle': 'Friday run',
            'observedAtMillis': 1000,
          },
        ],
        'originsTruncated': false,
        'traits': {
          'expectedEventCount': 1,
          'attendedEventCount': 1,
          'cancelledEventCount': 0,
          'noShowCount': 0,
          'importedEventCount': 0,
          'attendanceRate': 1,
          'segmentIds': <Object?>['regular'],
          'whatsappStatus': 'optedIn',
          'sourceCoverage': 'exact',
        },
        'revenue': {'coverage': 'exact', 'amounts': <Object?>[]},
        'events': <Object?>[],
        'eventsTruncated': false,
        'manualTags': <Object?>[
          {
            'tagId': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            'label': 'Brings friends',
          },
        ],
        'manualTagVocabulary': <Object?>[
          {
            'tagId': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            'label': 'Brings friends',
          },
          {
            'tagId': 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            'label': 'Prefers weekends',
          },
        ],
        'notes': <Object?>[
          {
            'noteId': 'note-1',
            'body': 'Introduced three friends.',
            'authorUid': 'manager-1',
            'createdAtMillis': 1000,
            'updatedAtMillis': 2000,
            'revision': 2,
          },
        ],
        'notesTruncated': false,
        'sends': <Object?>[
          {
            'kind': 'campaign',
            'campaignId': 'campaign-1',
            'name': 'August invite',
            'messageClass': 'organizerPromotion',
            'deliveryStatus': 'delivered',
            'createdAtMillis': 3000,
            'sentAtMillis': 4000,
            'updatedAtMillis': 5000,
          },
          {
            'kind': 'announcement',
            'broadcastId': 'broadcast-1',
            'eventId': 'event-1',
            'eventName': 'Friday run',
            'audience': 'booked',
            'deliveryStatus': 'available',
            'sentAtMillis': 6000,
            'partialFailure': false,
          },
        ],
        'sendsTruncated': false,
        'timeline': <Object?>[
          {
            'kind': 'send',
            'timelineId': 'timeline-send-1',
            'sendKind': 'manualHandoff',
            'name': 'Ananya Rao',
            'status': 'handoffOpened',
            'deliveryMode': 'byHand',
            'observation': 'hostOpened',
            'referenceId': 'task-1',
            'occurredAtMillis': 7000,
          },
          {
            'kind': 'outreach',
            'timelineId': 'timeline-outreach-1',
            'channel': 'phoneCall',
            'outcome': 'noAnswer',
            'notePreview': 'Try again after 6pm',
            'occurredAtMillis': 8000,
          },
        ],
        'timelineTruncated': false,
        'timelineCoverage': {
          'forms': 'exact',
          'events': 'exact',
          'sends': 'exact',
          'replies': 'partial',
          'outreach': 'exact',
          'replyObservation': 'catchAndManagedWhatsappOnly',
        },
        'revision': 4,
      });

      expect(detail.manualTags.single.label, 'Brings friends');
      expect(
        detail.whatsappPermission.purposes['eventOperations']?.status.name,
        'optedIn',
      );
      expect(
        detail
            .whatsappPermission
            .purposes['eventOperations']
            ?.deliveryAvailable,
        isFalse,
      );
      expect(
        detail.whatsappPermission.purposes['marketing']?.status.name,
        'optedOut',
      );
      expect(detail.whatsappPermission.effectiveStatus.name, 'optedIn');
      expect(detail.manualTagVocabulary, hasLength(2));
      expect(detail.notes.single.wasEdited, isTrue);
      expect(
        detail.sends.first.deliveryStatus,
        HostCustomerSendDeliveryStatus.delivered,
      );
      expect(detail.sends.last.kind, HostCustomerSendKind.announcement);
      expect(detail.sends.last.eventId, 'event-1');
      expect(detail.timeline.length, 2);
      expect(detail.timeline.first, isA<HostCustomerSendTimelineEntry>());
      final outreach = detail.timeline.last;
      expect(outreach, isA<HostCustomerOutreachTimelineEntry>());
      final logged = outreach as HostCustomerOutreachTimelineEntry;
      expect(logged.outcome, HostCustomerOutreachOutcome.noAnswer);
      expect(logged.channel, HostCustomerOutreachChannel.phoneCall);
      expect(logged.notePreview, 'Try again after 6pm');
      expect(
        detail.timelineCoverage.outreach,
        HostCustomerTimelineCoverageValue.exact,
      );
      expect(
        detail.sends.last.deliveryStatus,
        HostCustomerSendDeliveryStatus.available,
      );
    },
  );

  test('manual tag is part of audience pagination query identity', () {
    const first = HostAudienceQuery(manualTagId: 'tag-1', cursor: 'cursor-1');
    const second = HostAudienceQuery(manualTagId: 'tag-2', cursor: 'cursor-1');

    expect(first, isNot(second));
    expect(first.copyWith(clearCursor: true).cursor, isNull);
    expect(first.copyWith(clearManualTag: true).manualTagId, isNull);
  });
}
