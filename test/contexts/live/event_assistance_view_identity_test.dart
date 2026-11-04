import 'package:catch_dating_app/contexts/live/data/event_assistance_view_identity.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  // functions/src/hostReadModels/movementViewTriggers.test.ts pins these.
  final whole = EventAssistanceGroupScope(
    organizerId: 'org-1',
    eventId: 'event-1',
    groupId: 'event:whole',
  );

  test('group progress view ids match the server', () {
    expect(
      groupProgressViewId(whole),
      'progress:763536da95cdb87bce6bad6f19ac4b406a48212521bb493f673300ca87bde7a5',
    );
    expect(
      groupProgressViewId(
        EventAssistanceGroupScope(
          organizerId: 'org-1',
          eventId: 'event-1',
          groupId: 'easy',
        ),
      ),
      'progress:ecbd2b57677bea99746c770abdce60b48bd7ecd6a1739e9585d771bdf84d2a1f',
    );
  });

  test('checkpoint view ids match the server', () {
    expect(
      checkpointViewId(
        EventAssistanceCheckpointScope(
          group: whole,
          checkpoint: AssistanceAccountabilityCheckpoint(
            checkpointId: 'stop-2',
            progressRevision: 3,
          ),
        ),
      ),
      'checkpoint:b0cd2cb234df1869e45add17f36e3d810453a98739a899ac6e12ad09d7301ed1',
    );
  });
}
