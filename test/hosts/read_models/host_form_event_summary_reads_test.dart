import 'package:catch_dating_app/contexts/events/data/read_models/host_event_summary_reads.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_summary_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/hosts/data/read_models/host_summary_reader.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Forms apply indexed lifecycle filters before pagination', () async {
    final db = FakeFirebaseFirestore();
    await db.collection('hostDirectorySummaries').doc('org').set({
      'organizerId': 'org',
      'formSummaryVersion': 1,
    });
    final row = {
      'organizerId': 'org',
      'formId': 'form',
      'title': 'Survey',
      'description': null,
      'purpose': 'survey',
      'status': 'published',
      'templateId': 'blank',
      'publicFormId': 'public-form-123456789012',
      'defaultTargetKind': 'organizer',
      'defaultTargetId': null,
      'activeVersionId': 'version',
      'draftRevision': 1,
      'publishedVersion': 1,
      'submittedResponseCount': 0,
      'consequences': {
        'coverage': 'unavailable',
        'identityPolicy': null,
        'enabledAutomationActionKinds': <String>[],
      },
      'updatedAtMillis': 1000,
      'publishedAtMillis': 1000,
      'lastResponseAtMillis': null,
    };
    await db.collection('hostFormSummaries').doc('form').set({
      'organizerId': 'org',
      'version': 1,
      'status': 'published',
      'purpose': 'survey',
      'updatedAtMillis': 1000,
      'row': row,
    });
    await db.collection('hostFormSummaries').doc('archived').set({
      'organizerId': 'org',
      'version': 1,
      'status': 'archived',
      'purpose': 'survey',
      'updatedAtMillis': 2000,
      'row': row,
    });
    final reads = HostFormSummaryReads(
      HostSummaryReader(db, actorId: () => 'host'),
    );
    final page = await reads.list(
      const HostFormListRequest(organizerId: 'org'),
    );
    expect(page!.items.map((item) => item.formId), ['form']);
    expect(page.nextCursor, isNull);
    expect(
      await reads.list(
        const HostFormListRequest(organizerId: 'org', query: 'substring'),
      ),
      isNull,
      reason: 'Substring search retains the existing server behavior.',
    );
  });

  test(
    'Events keep unpublished upcoming and history scopes separate',
    () async {
      final db = FakeFirebaseFirestore();
      await db.collection('hostDirectorySummaries').doc('org').set({
        'organizerId': 'org',
        'eventSummaryVersion': 1,
      });
      final now = DateTime.now().millisecondsSinceEpoch;
      for (final entry in {
        'past': now - 100000,
        'future': now + 100000,
      }.entries) {
        await db.collection('hostEventSummaries').doc(entry.key).set({
          'organizerId': 'org',
          'version': 1,
          'status': 'active',
          'startTimeMillis': entry.value,
          'row': {
            'eventId': entry.key,
            'name': entry.key,
            'city': {'cityId': 'city', 'marketId': 'market'},
            'localDate': '2026-10-08',
            'localStartTime': '18:00',
            'timezone': 'Asia/Kolkata',
            'startTimeMillis': entry.value,
            'setupRevision': 1,
            'status': 'active',
            'detailsConfigured': false,
          },
        });
      }
      final reads = HostEventSummaryReads(
        HostSummaryReader(db, actorId: () => 'host'),
      );
      final upcoming = await reads.list(
        organizerId: 'org',
        scope: PrivateEventSetupScope.upcoming,
        limit: 20,
      );
      final past = await reads.list(
        organizerId: 'org',
        scope: PrivateEventSetupScope.past,
        limit: 20,
      );
      expect(upcoming!.events.map((item) => item.eventId), ['future']);
      expect(past!.events.map((item) => item.eventId), ['past']);
    },
  );
}
