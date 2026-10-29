import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';

import 'event_rehearsal_assistance_fixtures.dart';

Map<String, Object?> practiceHelpQueueFixture(String key) =>
    Map<String, Object?>.from(
      (jsonDecode(
                File(
                  'test/event_rehearsal/fixtures/help_queue.json',
                ).readAsStringSync(),
              )
              as Map)[key]
          as Map,
    );

EventRehearsalBootstrap practiceHelpSnapshot([String key = 'initial']) =>
    EventRehearsalBootstrap.fromCallableData(practiceHelpQueueFixture(key));

/// Unit-test parent receipt around the actual backend help projection.
Map<String, Object?> practiceHelpResult(
  RehearsalAssistanceChange change, {
  bool laterResolution = false,
}) {
  final command = change.command as RehearsalResolveAssistance;
  final transfer = command.decision is AssistanceCaseTransfer;
  final raw = practiceHelpQueueFixture(
    transfer && !laterResolution ? 'assigned' : 'resolved',
  );
  final session = raw['session'] as Map;
  session['runtimeRevision'] =
      change.session.runtimeRevision + 1 + (laterResolution ? 1 : 0);
  session['actionCount'] =
      change.session.actionCount + 1 + (laterResolution ? 1 : 0);
  raw['actions'] = [practiceReceipt(change)];
  final row = ((raw['helpRequests'] as Map)['cases'] as List).single as Map;
  row['revision'] = command.snapshot.revision + 1 + (laterResolution ? 1 : 0);
  if (transfer && !laterResolution) {
    (row['assignment'] as Map)['uid'] =
        (command.decision as AssistanceCaseTransfer).managerUid;
  } else {
    (row['resolution'] as Map)['outcome'] =
        command.decision is AssistanceCaseDecline ? 'declined' : 'resolved';
    (row['resolution'] as Map)['actorUid'] = command.actorUid;
  }
  return raw;
}
