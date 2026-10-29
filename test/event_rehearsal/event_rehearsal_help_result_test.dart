import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/platform/cryptography/sha256_digest.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_help_queue_fixtures.dart';

void main() {
  test(
    'practice help receipt must confirm this case, original clock and decision',
    () {
      final before = practiceHelpSnapshot();
      final change = RehearsalAssistanceChange(
        snapshot: before,
        command: RehearsalResolveAssistance(
          snapshot: before.helpRequests!.cases.single as RehearsalOpenHelpCase,
          actorUid: 'host-1',
          decision: const AssistanceCaseDecision.resolve(),
        ),
        clientActionId: 'help_native_result',
      );
      change.requireResult(
        EventRehearsalBootstrap.fromCallableData(practiceHelpResult(change)),
      );
      for (final mutation in [
        'clock',
        'duplicateReceipt',
        'wrongOutcome',
        'unchangedCase',
      ]) {
        final raw = practiceHelpResult(change);
        final row =
            ((raw['helpRequests'] as Map)['cases'] as List).single as Map;
        switch (mutation) {
          case 'clock':
            (raw['session'] as Map)['virtualStartedAtMillis'] = 0;
            (raw['helpRequests'] as Map)['clockId'] =
                'clock:${sha256Digest(jsonEncode([before.session.id, 0, before.session.setupRevision]))}';
          case 'duplicateReceipt':
            (raw['actions'] as List).add((raw['actions'] as List).single);
          case 'wrongOutcome':
            (row['resolution'] as Map)['outcome'] = 'declined';
          case 'unchangedCase':
            row['sourceHash'] = before.helpRequests!.cases.single.sourceHash;
        }
        final result = EventRehearsalBootstrap.fromCallableData(raw);
        expect(
          () => change.requireResult(result),
          throwsFormatException,
          reason: mutation,
        );
      }
    },
  );
}
