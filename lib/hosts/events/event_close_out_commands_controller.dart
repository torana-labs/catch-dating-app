import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/live/data/event_attendance_report_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_close_out_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_report.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_close_out_commands_controller.g.dart';

/// The time the close-out thank-you goes, the morning after.
const hostEventCloseOutThankYouAt = '10:00';

/// Close out the night through `setEventCloseOut`, and record a booked
/// guest who did not come through `recordEventNoShow`. Neither invalidates
/// a read: the close-out and attendance report listeners deliver the
/// result.
@riverpod
class HostEventCloseOutCommands extends _$HostEventCloseOutCommands {
  static final closeOutMutation = Mutation<void>();
  static final noShowMutation = Mutation<EventNoShowOutcome>();

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

  /// Records that the guest did not come, as the host confirmed. A retry
  /// with the same [operationId] replays.
  Future<EventNoShowOutcome> recordNoShow({
    required String organizerId,
    required String eventId,
    required String attendeeId,
    required String operationId,
  }) async {
    requireSignedInUid(ref, action: 'record a no-show');
    return ref
        .read(eventAttendanceReportRepositoryProvider)
        .recordNoShow(
          organizerId: organizerId,
          eventId: eventId,
          attendeeId: attendeeId,
          operationId: operationId,
        );
  }
}
