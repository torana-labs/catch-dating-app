import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

class _Functions extends Fake implements FirebaseFunctions {}

const _org = 'organizer-1';
final _now = DateTime.utc(2026, 11, 17, 12);
int _millis(Duration ago) => _now.subtract(ago).millisecondsSinceEpoch;

Map<String, Object?> _threadView(
  String threadId, {
  String organizerId = _org,
  required Duration lastMessageAgo,
  String body = 'Is parking free?',
  Duration retainedFor = const Duration(days: 300),
}) => {
  'organizerId': organizerId,
  'threadId': threadId,
  'contactId': 'contact-$threadId',
  'linkedUid': null,
  'displayName': 'Person $threadId',
  'eventIds': <String>[],
  'lastMessageBody': body,
  'lastMessageDirection': 'inbound',
  'lastMessageAtMillis': _millis(lastMessageAgo),
  'lastInboundAtMillis': _millis(lastMessageAgo),
  'serviceWindowExpiresAtMillis': _millis(
    lastMessageAgo - const Duration(hours: 24),
  ),
  'expiresAtMillis': _now.add(retainedFor).millisecondsSinceEpoch,
  'version': 1,
};

Map<String, Object?> _message(
  String threadId, {
  required String direction,
  required String body,
  required Duration ago,
  String organizerId = _org,
  Duration retainedFor = const Duration(days: 300),
}) => {
  'organizerId': organizerId,
  'threadId': threadId,
  'contactId': 'contact-$threadId',
  'connectionId': 'connection-1',
  'direction': direction,
  'body': body,
  'providerMessageId': 'wamid.$body',
  'actorUid': null,
  'occurredAt': Timestamp.fromDate(_now.subtract(ago)),
  'createdAt': Timestamp.fromDate(_now.subtract(ago)),
  'expiresAt': Timestamp.fromDate(_now.add(retainedFor)),
};

Map<String, Object?> _send(
  String sendId,
  Map<String, Object?> row, {
  String organizerId = _org,
}) => {
  'organizerId': organizerId,
  'sendId': sendId,
  'kind': row['kind'],
  'activityAtMillis': row['activityAtMillis'],
  'row': row,
  'version': 1,
};

Map<String, Object?> _campaign(
  String id, {
  required String status,
  required int activityAtMillis,
  int? scheduledAtMillis,
}) => {
  'kind': 'campaign',
  'campaignId': id,
  'name': 'Campaign $id',
  'status': status,
  'savedAudienceId': null,
  'savedAudienceName': null,
  'segmentIds': <String>[],
  'templateId': 'template-1',
  'templateName': 'Weekly invite',
  'audienceCounts': {'total': 3},
  'deliveryCounts': {'sent': 0},
  'scheduledAtMillis': scheduledAtMillis,
  'dispatchedAtMillis': null,
  'activityAtMillis': activityAtMillis,
};

Future<LivePages<T>> _next<T>(StreamIterator<LivePages<T>> pages) async {
  expect(await pages.moveNext(), isTrue);
  return pages.current;
}

void main() {
  late FakeFirebaseFirestore firestore;
  late ScopedReadModelReader summaries;
  const clock = AppClock.custom(_clockNow);

  setUp(() {
    firestore = FakeFirebaseFirestore();
    summaries = ScopedReadModelReader(
      firestore,
      family: hostReadModels,
      actorId: () => 'host-1',
    );
  });

  HostWhatsappRepository whatsapp() => HostWhatsappRepository(
    _Functions(),
    firestore: firestore,
    summaries: summaries,
    clock: clock,
  );

  test('the inbox lists thread views newest first and stays live', () async {
    await firestore
        .doc('hostWhatsappThreadViews/owt_old')
        .set(_threadView('owt_old', lastMessageAgo: const Duration(days: 2)));
    await firestore
        .doc('hostWhatsappThreadViews/owt_new')
        .set(_threadView('owt_new', lastMessageAgo: const Duration(hours: 1)));
    await firestore
        .doc('hostWhatsappThreadViews/owt_foreign')
        .set(
          _threadView(
            'owt_foreign',
            organizerId: 'organizer-2',
            lastMessageAgo: Duration.zero,
          ),
        );

    final pages = StreamIterator(whatsapp().watchWhatsappThreads(_org).pages);
    addTearDown(pages.cancel);
    var page = await _next(pages);
    expect(page.items.map((thread) => thread.threadId), ['owt_new', 'owt_old']);
    expect(page.items.first.serviceWindowOpen, isTrue);
    expect(page.hasMore, isFalse);

    // A webhook message moves its thread to the top without a reload.
    await firestore
        .doc('hostWhatsappThreadViews/owt_old')
        .set(
          _threadView(
            'owt_old',
            lastMessageAgo: Duration.zero,
            body: 'Running late',
          ),
        );
    page = await _next(pages);
    expect(page.items.map((thread) => thread.threadId), ['owt_old', 'owt_new']);
    expect(page.items.first.lastMessageBody, 'Running late');
  });

  test('a conversation joins its view and newest retained messages', () async {
    await firestore
        .doc('hostWhatsappThreadViews/owt_a')
        .set(_threadView('owt_a', lastMessageAgo: const Duration(hours: 30)));
    await firestore
        .collection('organizerWhatsappMessages')
        .doc('owm_1')
        .set(
          _message(
            'owt_a',
            direction: 'inbound',
            body: 'Hello',
            ago: const Duration(hours: 31),
          ),
        );
    await firestore
        .collection('organizerWhatsappMessages')
        .doc('owm_2')
        .set(
          _message(
            'owt_a',
            direction: 'outbound',
            body: 'Hi there',
            ago: const Duration(hours: 30),
          ),
        );
    await firestore
        .collection('organizerWhatsappMessages')
        .doc('owm_expired')
        .set(
          _message(
            'owt_a',
            direction: 'inbound',
            body: 'Old',
            ago: const Duration(hours: 40),
            retainedFor: const Duration(seconds: -1),
          ),
        );
    await firestore
        .collection('organizerWhatsappMessages')
        .doc('owm_other')
        .set(
          _message(
            'owt_b',
            direction: 'inbound',
            body: 'Another thread',
            ago: const Duration(hours: 1),
          ),
        );

    final details = StreamIterator(
      whatsapp().watchWhatsappThread(organizerId: _org, threadId: 'owt_a'),
    );
    addTearDown(details.cancel);
    expect(await details.moveNext(), isTrue);
    var detail = details.current!;
    expect(detail.messages.map((message) => message.body), [
      'Hello',
      'Hi there',
    ]);
    expect(detail.serviceWindowOpen, isFalse);
    expect(detail.messagesTruncated, isFalse);

    // A new customer message reopens the reply window before the view
    // catches up, and fences the reply on its time.
    await firestore
        .collection('organizerWhatsappMessages')
        .doc('owm_3')
        .set(
          _message(
            'owt_a',
            direction: 'inbound',
            body: 'Are you there?',
            ago: const Duration(minutes: 5),
          ),
        );
    await flushTestEventQueue();
    expect(await details.moveNext(), isTrue);
    detail = details.current!;
    expect(detail.messages.last.body, 'Are you there?');
    expect(detail.serviceWindowOpen, isTrue);
    expect(
      detail.lastInboundAt.millisecondsSinceEpoch,
      _millis(const Duration(minutes: 5)),
    );
  });

  test('a thread without a view, or past retention, reads as none', () async {
    await firestore
        .doc('hostWhatsappThreadViews/owt_gone')
        .set(
          _threadView(
            'owt_gone',
            lastMessageAgo: const Duration(days: 1),
            retainedFor: const Duration(seconds: -1),
          ),
        );
    expect(
      await whatsapp()
          .watchWhatsappThread(organizerId: _org, threadId: 'owt_gone')
          .first,
      isNull,
    );
    expect(
      await whatsapp()
          .watchWhatsappThread(organizerId: _org, threadId: 'owt_none')
          .first,
      isNull,
    );
  });

  test('Sends history and the draft picker read hostSendSummaries', () async {
    final repository = HostCampaignRepository(
      _Functions(),
      summaries: summaries,
    );
    await firestore
        .doc('hostSendSummaries/campaign_draft')
        .set(
          _send(
            'campaign_draft',
            _campaign('draft', status: 'draft', activityAtMillis: 3000),
          ),
        );
    await firestore
        .doc('hostSendSummaries/campaign_sent')
        .set(
          _send(
            'campaign_sent',
            _campaign('sent', status: 'completed', activityAtMillis: 2000),
          ),
        );
    await firestore
        .doc('hostSendSummaries/announcement_b1')
        .set(
          _send('announcement_b1', {
            'kind': 'announcement',
            'broadcastId': 'b1',
            'eventId': 'event-1',
            'eventName': 'Friday run',
            'audience': 'booked',
            'recipientCount': 8,
            'sentAtMillis': 1000,
            'partialFailure': false,
            'activityAtMillis': 1000,
          }),
        );
    await firestore
        .doc('hostSendSummaries/campaign_foreign')
        .set(
          _send(
            'campaign_foreign',
            _campaign('foreign', status: 'draft', activityAtMillis: 9000),
            organizerId: 'organizer-2',
          ),
        );

    final history = await repository.watchSends(_org).pages.first;
    expect(history.items.map((send) => send.id), ['draft', 'sent', 'b1']);
    expect(history.items.last, isA<HostAnnouncementSendSummary>());

    final drafts = await repository.watchDraftCampaigns(_org).pages.first;
    expect(drafts.items.map((campaign) => campaign.campaignId), ['draft']);
  });
}

DateTime _clockNow() => _now;
