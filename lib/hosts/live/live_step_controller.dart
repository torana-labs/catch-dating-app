import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'live_step_controller.g.dart';

/// Pause and Resume for the live console's active step, each a
/// `controlEventSuccessLive` action fenced on the plan's live-control
/// revision. Repeating either replays on the server. Neither invalidates a
/// read: the plan listener delivers the paused state.
@riverpod
class HostLiveStepCommands extends _$HostLiveStepCommands {
  static final pauseMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> pause({
    required String eventId,
    required int expectedRevision,
  }) async {
    requireSignedInUid(ref, action: 'pause the step');
    await ref
        .read(eventSuccessRepositoryProvider)
        .pauseActiveStep(eventId: eventId, expectedRevision: expectedRevision);
  }

  Future<void> resume({
    required String eventId,
    required int expectedRevision,
  }) async {
    requireSignedInUid(ref, action: 'resume the step');
    await ref
        .read(eventSuccessRepositoryProvider)
        .resumeActiveStep(eventId: eventId, expectedRevision: expectedRevision);
  }
}
