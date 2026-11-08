import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/live/data/event_close_out_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_close_out_commands_controller.g.dart';

/// The time the close-out thank-you goes, the morning after.
const hostEventCloseOutThankYouAt = '10:00';

/// Close out the night through `setEventCloseOut`. It does not invalidate
/// a read: the close-out listener delivers the saved choices.
@riverpod
class HostEventCloseOutCommands extends _$HostEventCloseOutCommands {
  static final closeOutMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> closeOut({
    required String organizerId,
    required String eventId,
    required String requestId,
    required int expectedRevision,
    required bool thankYou,
    required bool openStayInTouchPicks,
    required bool noShowNote,
  }) async {
    requireSignedInUid(ref, action: 'close out the night');
    await ref
        .read(eventCloseOutRepositoryProvider)
        .set(
          organizerId: organizerId,
          eventId: eventId,
          requestId: requestId,
          expectedRevision: expectedRevision,
          thankYouAtLocal: thankYou ? hostEventCloseOutThankYouAt : null,
          openStayInTouchPicks: openStayInTouchPicks,
          noShowNote: noShowNote,
        );
  }
}
