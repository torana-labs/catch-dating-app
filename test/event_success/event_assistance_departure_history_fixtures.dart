import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:flutter_test/flutter_test.dart';

const historyActor = 'host-1';
EventAssistanceDepartureHistoryQuery historyQuery({int? beforeRevision}) =>
    EventAssistanceDepartureHistoryQuery(
      EventAssistanceGroupScope(
        organizerId: 'o-departure-history-native',
        eventId: 'e-departure-history-native',
        groupId: 'event:whole',
      ),
      beforeRevision: beforeRevision,
    );

Map<String, Object?> historyResponse() =>
    (jsonDecode(
              File(
                'test/event_success/fixtures/departure_history.json',
              ).readAsStringSync(),
            )
            as Map)
        .cast<String, Object?>();

EventAssistanceDepartureHistoryPage historyPage({
  Map<String, Object?>? response,
  EventAssistanceDepartureHistoryQuery? query,
  String actorUid = historyActor,
}) => EventAssistanceDepartureHistoryPage.fromCallableData(
  response ?? historyResponse(),
  expectedQuery: query ?? historyQuery(),
  expectedActorUid: actorUid,
);

final class HistorySessionRepository extends Fake
    implements EventAssistanceDepartureHistoryRepository {
  final reads =
      <
        ({
          EventAssistanceDepartureHistoryQuery query,
          String actorUid,
          Completer<EventAssistanceDepartureHistoryPage> pending,
        })
      >[];
  Completer<void> _changed = Completer<void>();

  @override
  Future<EventAssistanceDepartureHistoryPage> fetch(
    EventAssistanceDepartureHistoryQuery query, {
    required String actorUid,
  }) {
    final pending = Completer<EventAssistanceDepartureHistoryPage>();
    reads.add((query: query, actorUid: actorUid, pending: pending));
    final change = _changed;
    _changed = Completer<void>();
    change.complete();
    return pending.future;
  }

  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  void completeRead(int index, {bool foreignActor = false}) {
    final read = reads[index];
    final response = historyResponse();
    final actor = foreignActor ? 'foreign' : read.actorUid;
    response['actorUid'] = actor;
    response['context'] = read.query.group.context;
    response['groupId'] = read.query.group.groupId;
    if (read.query.beforeRevision != null) {
      response['rosters'] = (response['rosters']! as List)
          .where(
            (r) =>
                ((r as Map)['progressRevision']! as int) <
                read.query.beforeRevision!,
          )
          .toList();
    }
    read.pending.complete(
      historyPage(response: response, query: read.query, actorUid: actor),
    );
  }
}
