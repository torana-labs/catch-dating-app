import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';

final accountabilityGroup = EventAssistanceGroupScope(
  organizerId: 'org-1',
  eventId: 'event-1',
  groupId: 'event:whole',
);
final accountabilityScope = EventAssistanceAccountabilityScope(
  group: accountabilityGroup,
  attendeeId: 'guest-1',
);
final checkpointAccountabilityScope = EventAssistanceAccountabilityScope(
  group: accountabilityGroup,
  attendeeId: 'guest-1',
  checkpoint: AssistanceAccountabilityCheckpoint(
    checkpointId: 'stop-1',
    progressRevision: 2,
  ),
);
final accountabilitySource = 'a' * 64;

Map<String, Object?> accountabilityWire({
  EventAssistanceAccountabilityScope? scope,
  String? reason,
  String? episodeId = 'episode-1',
  String disposition = 'unresolved',
  int revision = 0,
}) {
  final selected = scope ?? accountabilityScope;
  return {
    'outcome': 'read',
    'operationRevision': null,
    'view': {
      'context': selected.group.context,
      'groupId': selected.group.groupId,
      'attendeeId': selected.attendeeId,
      'checkpoint': ?selected.checkpoint?.toJson(),
      'serverTime': 1000,
      'sourceHash': accountabilitySource,
      'revision': revision,
      'episodeId': episodeId,
      'disposition': disposition,
      'availability': reason == null
          ? {'kind': 'ready'}
          : {'kind': 'unavailable', 'reason': reason},
    },
  };
}

EventAssistanceAccountabilityResult accountabilityResult(
  Map<String, Object?> data, {
  EventAssistanceAccountabilityScope? scope,
}) => EventAssistanceAccountabilityResult.fromCallableData(
  data,
  expectedScope: scope ?? accountabilityScope,
);
EventAssistanceAccountabilityView accountabilityView({
  EventAssistanceAccountabilityScope? scope,
  String? reason,
  String? episodeId = 'episode-1',
  String disposition = 'unresolved',
  int revision = 0,
}) => accountabilityResult(
  accountabilityWire(
    scope: scope,
    reason: reason,
    episodeId: episodeId,
    disposition: disposition,
    revision: revision,
  ),
  scope: scope,
).view;
EventAssistanceAccountabilityChange accountabilityChange({
  EventAssistanceAccountabilityView? view,
  AssistanceVisitDisposition disposition = AssistanceVisitDisposition.returned,
}) => EventAssistanceAccountabilityChange(
  snapshot: view ?? accountabilityView(),
  disposition: disposition,
  operationId: 'accountability-1',
);
Map<String, Object?> accountabilityAppliedWire(
  EventAssistanceAccountabilityChange change,
) {
  final wire = accountabilityWire(
    scope: change.snapshot.scope,
    episodeId: change.snapshot.episodeId,
    disposition: change.disposition.name,
    revision: change.snapshot.revision + 1,
  );
  wire.addAll({
    'outcome': 'applied',
    'operationRevision': change.snapshot.revision + 1,
  });
  (wire['view']! as Map<String, Object?>).addAll({
    'serverTime': 2000,
    'sourceHash': 'b' * 64,
  });
  return wire;
}
