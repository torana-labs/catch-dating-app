import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';

import 'event_rehearsal_assistance_fixtures.dart';

// Computed by the actual Functions practiceAccountabilityProjection for
// session-1, generation 1, virtual start 0 and these two actor IDs.
const practiceVisitClock =
    'clock:85ccf45e9bc51bbbf47d6e156728261b89d6b10dc7a6baa1af0102ed36ca4ae1';
const practiceVisitEpisodes = [
  'episode:14eb3aed7e548cb2e9ed3607d0d4c00d44493d9fe6ee66017541dc9aba63d904',
  'episode:9325bed93de1324b108aa2e38e5964aed0edf88a33cd183007918105c8923d6a',
];
Map<String, Object?> practiceVisitRow({int index = 0}) => {
  'attendeeId': 'actor-0${index + 1}',
  'episodeId': practiceVisitEpisodes[index],
  'sourceHash': 'a' * 64,
  'visitRevision': 1,
  'checkedInAtMillis': 500,
  'revision': 0,
  'disposition': 'unresolved',
  'availability': {'kind': 'ready'},
  'canResolve': true,
};

Map<String, Object?> practiceVisitBootstrap({
  int runtimeRevision = 4,
  int actionCount = 1,
  List<Map<String, Object?>>? actions,
  Map<String, Object?>? row,
}) {
  final wire = practiceBootstrap(
    runtimeRevision: runtimeRevision,
    actionCount: actionCount,
    actions: actions,
    actors: [
      for (var i = 0; i < 2; i++)
        {
          ...practiceActor(),
          'actorId': 'actor-0${i + 1}',
          'status': 'present',
          'layoutUnitId': null,
          'confirmedLayoutUnitId': null,
        },
    ],
  );
  ((wire['session']! as Map)['setup'] as Map)['moduleIds'] = [
    'arrival',
    'accountability',
  ];
  wire['accountabilityReviews'] = {
    'clockId': practiceVisitClock,
    'coverage': 'boundedSession',
    'rows': [row ?? practiceVisitRow(), practiceVisitRow(index: 1)],
  };
  return wire;
}

EventRehearsalBootstrap practiceVisitSnapshot() =>
    EventRehearsalBootstrap.fromCallableData(practiceVisitBootstrap());

RehearsalAssistanceChange practiceVisitChange({
  AssistanceVisitDisposition disposition = AssistanceVisitDisposition.returned,
  EventRehearsalBootstrap? snapshot,
}) {
  final view = snapshot ?? practiceVisitSnapshot();
  return RehearsalAssistanceChange(
    snapshot: view,
    clientActionId: 'visit-once',
    command: RehearsalResolveAccountability(
      snapshot:
          view.accountabilityReviews!.rows.first
              as RehearsalActionableAccountability,
      disposition: disposition,
    ),
  );
}

Map<String, Object?> practiceVisitResult(
  RehearsalAssistanceChange change, {
  int laterActions = 0,
  bool rejoined = false,
}) {
  final command = change.command as RehearsalResolveAccountability;
  final before = command.snapshot.evidence;
  final row = {
    ...practiceVisitRow(),
    'attendeeId': command.actorId,
    'episodeId': command.snapshot.scope.episodeId,
    'sourceHash': 'b' * 64,
    'revision': before.revision + 1,
    'visitRevision': rejoined
        ? before.visitRevision! + 2
        : before.visitRevision,
    'checkedInAtMillis': before.checkedInAtMillis,
    'disposition': rejoined ? 'unresolved' : command.disposition.name,
    'canResolve': change.session.actionCount + 1 + laterActions < 500,
  };
  final wire = practiceVisitBootstrap(
    runtimeRevision: change.session.runtimeRevision + 1 + laterActions,
    actionCount: change.session.actionCount + 1 + laterActions,
    actions: [practiceReceipt(change)],
    row: command.actorId == 'actor-01' ? row : null,
  );
  final rows = visitRows(wire);
  if (command.actorId == 'actor-02') rows[1].addAll(row);
  (wire['session']! as Map)['status'] = change.session.status.name;
  for (final r in rows) {
    if (change.session.actionCount + 1 + laterActions >= 500) {
      r['canResolve'] = false;
    }
  }
  return wire;
}

List<Map<String, Object?>> visitRows(Map<String, Object?> wire) =>
    ((wire['accountabilityReviews']! as Map)['rows'] as List)
        .map((r) => (r as Map).cast<String, Object?>())
        .toList();
