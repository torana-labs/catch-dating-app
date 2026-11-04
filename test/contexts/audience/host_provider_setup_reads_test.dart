import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/host_provider_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/host_provider_setup_reads.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _NoFunctions extends Fake implements FirebaseFunctions {}

const _organizerId = 'org-1';
const _eventId = 'event-1';

Map<String, Object?> _connectionRow({int revision = 2, String? status}) => {
  'connectionId': 'opc_1',
  'provider': 'luma',
  'status': status ?? 'active',
  'externalAccountId': 'calendar-1',
  'externalAccountName': 'Sunday Club',
  'syncMode': 'manualPoll',
  'capabilities': const {
    'eventList': true,
    'rosterIdentity': true,
    'registrationStatus': true,
    'providerCheckIn': true,
    'orderAmount': false,
    'refundStatus': false,
    'referralCode': false,
    'webhooks': false,
    'writeBookings': false,
  },
  'revision': revision,
  'lastHealthSyncAtMillis': null,
  'lastSuccessfulSyncAtMillis': 1786526400000,
};

Map<String, Object?> _view({
  String coverage = 'complete',
  List<Map<String, Object?>>? connections,
}) => {
  'schemaVersion': 1,
  'organizerId': _organizerId,
  'revision': 1,
  'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(1786526400000),
  'sourceCoverage': coverage,
  'incompleteSource': coverage == 'complete'
      ? null
      : 'organizerProviderConnections',
  'connections': connections ?? [_connectionRow()],
};

Map<String, Object?> _mapping({
  String organizerId = _organizerId,
  int revision = 1,
  String status = 'active',
}) => {
  'organizerId': organizerId,
  'eventId': _eventId,
  'connectionId': 'opc_1',
  'provider': 'luma',
  'externalEventId': 'evt-1',
  'status': status,
  'fieldAuthority': const {
    'rosterIdentity': 'provider',
    'registrationStatus': 'provider',
    'checkIn': 'providerWhenPresent',
    'orderAmount': 'unavailable',
    'refundStatus': 'unavailable',
    'referralCode': 'unavailable',
  },
  'revision': revision,
  'createdByUid': 'host-1',
  'createdAt': Timestamp.fromMillisecondsSinceEpoch(1786520000000),
  'updatedAt': Timestamp.fromMillisecondsSinceEpoch(1786526400000),
  'lastSyncAt': Timestamp.fromMillisecondsSinceEpoch(1786526400000),
  'lastSuccessfulSyncAt': null,
  'lastSyncStatus': 'completed',
  'lastSyncRunId': 'run-1',
  'disconnectedAt': null,
};

Future<void> _seed(
  FakeFirebaseFirestore db, {
  Map<String, Object?>? view,
  Map<String, Object?>? mapping,
}) async {
  if (view != null) {
    await db
        .collection(HostProviderSetupReads.connectionViews)
        .doc(_organizerId)
        .set(view);
  }
  if (mapping != null) {
    await db
        .collection(HostProviderSetupReads.mappings)
        .doc(externalEventMappingId(_eventId))
        .set(mapping);
  }
}

Stream<HostProviderSetup> _watch(FakeFirebaseFirestore db) =>
    HostProviderSetupReads(
      db,
    ).watch(organizerId: _organizerId, eventId: _eventId);

void main() {
  test('the mapping id matches the vectors Functions derives', () {
    // functions/src/organizers/organizerProviderSetup.test.ts pins the same.
    expect(
      externalEventMappingId('event-1'),
      'eem_ce36863f51b6baf9d16397ffb3e9af506b284a816f72d487',
    );
    expect(
      externalEventMappingId('evt_9f2c1a'),
      'eem_79da0b148e3e4b3651f4e3da90ba5b5463b849ddf8fe5273',
    );
  });

  test('every generated catalog row parses, in display order', () {
    expect(hostProviderCatalog, hasLength(9));
    expect(hostProviderCatalog.first.provider, ExternalBookingProvider.generic);
    final luma = hostProviderCatalog.firstWhere(
      (entry) => entry.provider == ExternalBookingProvider.luma,
    );
    expect(luma.availability, HostProviderAvailability.available);
    expect(luma.capabilities.eventList, isTrue);
    expect(luma.capabilities.writeBookings, isFalse);
  });

  test('composes the catalog, the connection view and the mapping', () async {
    final db = FakeFirebaseFirestore();
    await _seed(db, view: _view(), mapping: _mapping());

    final setup = await _watch(db).first;

    expect(setup.sourceCoverage, HostProviderSetupCoverage.complete);
    expect(setup.organizerId, _organizerId);
    expect(setup.eventId, _eventId);
    expect(setup.providers, hostProviderCatalog);
    expect(setup.mapping?.mappingId, externalEventMappingId(_eventId));
    expect(setup.mapping?.externalEventId, 'evt-1');
    expect(
      setup.mapping?.lastSyncAt,
      DateTime.fromMillisecondsSinceEpoch(1786526400000),
    );
    expect(setup.mapping?.lastSuccessfulSyncAt, isNull);
    expect(setup.mappedConnection?.externalAccountName, 'Sunday Club');
  });

  test('a view the server has not written is missing, with no rows', () async {
    final db = FakeFirebaseFirestore();

    final setup = await _watch(db).first;

    expect(setup.sourceCoverage, HostProviderSetupCoverage.missing);
    expect(setup.connections, isEmpty);
    expect(setup.mapping, isNull);
  });

  test('over-cap and invalid views keep their rows and say so', () async {
    for (final (wire, coverage) in [
      ('overCap', HostProviderSetupCoverage.overCap),
      ('invalidSource', HostProviderSetupCoverage.invalidSource),
    ]) {
      final db = FakeFirebaseFirestore();
      await _seed(db, view: _view(coverage: wire));
      final setup = await _watch(db).first;
      expect(setup.sourceCoverage, coverage);
      expect(setup.connections.single.connectionId, 'opc_1');
    }
  });

  test('a mapping that belongs to another organizer is no mapping', () async {
    final db = FakeFirebaseFirestore();
    await _seed(
      db,
      view: _view(),
      mapping: _mapping(organizerId: 'org-2'),
    );

    final setup = await _watch(db).first;

    expect(setup.mapping, isNull);
    expect(setup.mappedConnection, isNull);
  });

  test('a view for another organizer is a format error', () async {
    final db = FakeFirebaseFirestore();
    await _seed(db, view: {..._view(), 'organizerId': 'org-2'});

    await expectLater(_watch(db).first, throwsA(anything));
  });

  test('delivers changes while it is listened to', () async {
    final db = FakeFirebaseFirestore();
    await _seed(db, view: _view(), mapping: _mapping());
    final deliveries = <HostProviderSetup>[];
    final subscription = _watch(db).listen(deliveries.add);
    await pumpEventQueue();

    await _seed(db, mapping: _mapping(revision: 2, status: 'disconnected'));
    await pumpEventQueue();

    expect(deliveries.last.mapping?.revision, 2);
    expect(deliveries.last.mapping?.status, 'disconnected');
    await subscription.cancel();
  });

  test('a command waits for the listeners to deliver its write', () async {
    final db = FakeFirebaseFirestore();
    await _seed(db, view: _view(), mapping: _mapping());
    final repository = HostProviderRepository(
      _NoFunctions(),
      setups: HostProviderSetupReads(db),
    );
    final receipt = HostProviderSetup(
      organizerId: _organizerId,
      eventId: _eventId,
      providers: hostProviderCatalog,
      connections: [
        HostProviderConnection.fromMap(_connectionRow(revision: 3)),
      ],
      mapping: HostProviderEventMapping.fromMap({
        'mappingId': externalEventMappingId(_eventId),
        'connectionId': 'opc_1',
        'externalEventId': 'evt-1',
        'status': 'active',
        'revision': 2,
        'lastSyncAtMillis': null,
        'lastSuccessfulSyncAtMillis': null,
        'lastSyncStatus': 'never',
        'lastSyncRunId': null,
      }),
    );
    var reflected = false;
    unawaited(repository.untilReflected(receipt).then((_) => reflected = true));
    await pumpEventQueue();
    expect(reflected, isFalse);

    await _seed(db, mapping: _mapping(revision: 2));
    await pumpEventQueue();
    expect(reflected, isFalse, reason: 'the connection is still revision 2');

    await _seed(db, view: _view(connections: [_connectionRow(revision: 3)]));
    await pumpEventQueue();
    expect(reflected, isTrue);
  });

  test('a command stops waiting after its deadline', () async {
    final db = FakeFirebaseFirestore();
    final repository = HostProviderRepository(
      _NoFunctions(),
      setups: HostProviderSetupReads(db),
    );
    final receipt = HostProviderSetup(
      organizerId: _organizerId,
      eventId: _eventId,
      providers: hostProviderCatalog,
      connections: const [],
      mapping: null,
    );
    await expectLater(
      repository.untilReflected(
        receipt,
        timeout: const Duration(milliseconds: 10),
      ),
      completes,
    );
  });
}
