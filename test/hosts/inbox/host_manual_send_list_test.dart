import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _UnusedFunctions extends Fake implements FirebaseFunctions {}

final _now = DateTime.utc(2030, 6, 18, 12);

Map<String, Object?> _task(
  String id, {
  String organizerId = 'org',
  bool active = true,
  String status = 'queued',
  required int updatedMinute,
  Duration expiresIn = const Duration(days: 20),
}) => {
  'organizerId': organizerId,
  'taskId': id,
  'contactId': 'contact-$id',
  'sourceKind': 'individualConversation',
  'sourceId': 'contact-$id',
  'intent': 'individualConversation',
  'routeId': 'personalWhatsappHandoff',
  'deliveryMode': 'byHand',
  'status': status,
  'active': active,
  'revision': 2,
  'idempotencyKey': 'request-$id',
  'requestHash': 'a' * 64,
  'displayNameSnapshot': 'Guest $id',
  'endpointE164Snapshot': '+15555550100',
  'endpointHash': 'b' * 64,
  'prefillText': 'See you Friday',
  'prefillHash': 'c' * 64,
  'openCount': 0,
  'createdByUid': 'host',
  'updatedByUid': 'host',
  'createdAt': Timestamp.fromDate(_now.subtract(const Duration(days: 1))),
  'updatedAt': Timestamp.fromDate(
    _now.subtract(Duration(minutes: 60 - updatedMinute)),
  ),
  'openedAt': null,
  'expiresAt': Timestamp.fromDate(_now.add(expiresIn)),
};

void main() {
  Future<(ProviderContainer, FakeFirebaseFirestore)> setup() async {
    final db = FakeFirebaseFirestore();
    final tasks = db.collection(HostCommunicationRepository.manualSendTasks);
    await tasks.doc('older').set(_task('older', updatedMinute: 10));
    await tasks.doc('newer').set(_task('newer', updatedMinute: 30));
    await tasks
        .doc('done')
        .set(
          _task(
            'done',
            updatedMinute: 40,
            active: false,
            status: 'hostMarkedSent',
          ),
        );
    await tasks
        .doc('lapsed')
        .set(
          _task(
            'lapsed',
            updatedMinute: 20,
            expiresIn: const Duration(minutes: -1),
          ),
        );
    await tasks
        .doc('foreign')
        .set(_task('foreign', organizerId: 'other', updatedMinute: 50));
    final container = ProviderContainer(
      overrides: [
        hostCommunicationRepositoryProvider.overrideWithValue(
          HostCommunicationRepository(
            _UnusedFunctions(),
            firestore: db,
            clock: AppClock.custom(() => _now),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);
    container.listen(hostManualSendTaskPagesProvider('org'), (_, _) {});
    return (container, db);
  }

  test('the by-hand queue lists active handoffs newest first and reads an '
      'expired one as the callable did', () async {
    final (container, _) = await setup();
    final pages = await container.read(
      hostManualSendTaskPagesProvider('org').future,
    );
    expect(pages.items.map((task) => task.taskId), [
      'newer',
      'lapsed',
      'older',
    ]);
    expect(pages.hasMore, isFalse);
    final lapsed = pages.items[1];
    expect(lapsed.status, HostManualSendTaskStatus.expired);
    expect(lapsed.active, isFalse);
    final newer = pages.items.first;
    expect(newer.status, HostManualSendTaskStatus.queued);
    expect(newer.displayName, 'Guest newer');
    expect(newer.phoneE164, '+15555550100');
    expect(newer.prefillText, 'See you Friday');
  });

  test('a handoff marked sent elsewhere leaves the queue at once', () async {
    final (container, db) = await setup();
    await container.read(hostManualSendTaskPagesProvider('org').future);
    await db
        .collection(HostCommunicationRepository.manualSendTasks)
        .doc('newer')
        .update({'active': false, 'status': 'hostMarkedSent'});
    await flushTestEventQueue();
    final LivePages<HostManualSendTask> pages = container
        .read(hostManualSendTaskPagesProvider('org'))
        .requireValue;
    expect(pages.items.map((task) => task.taskId), ['lapsed', 'older']);
  });

  test('a document with an unsafe route fails the list', () {
    expect(
      () => HostManualSendTask.fromMap(
        HostCommunicationRepository.manualSendTaskRow('t', {
          ..._task('t', updatedMinute: 1),
          'routeId': 'managedWhatsapp',
        }, now: _now),
      ),
      throwsFormatException,
    );
  });
}
