import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_outbox_notice.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The notices a staff screen leads with when it is not plainly live: the
/// saved copy it shows offline, the work this phone has not sent, and the
/// last send or journal failure.
class StaffOperationsNotices extends StatelessWidget {
  const StaffOperationsNotices({
    super.key,
    required this.outbox,
    required this.busy,
    required this.onSync,
    required this.onReview,
    this.savedAt,
    this.errorMessage,
    this.onSaveCopy,
  });

  /// When the shown view was saved on this phone, while offline.
  final DateTime? savedAt;
  final ProgramOperationOutboxSummary outbox;
  final bool busy;
  final String? errorMessage;
  final VoidCallback onSync;
  final VoidCallback onReview;
  final VoidCallback? onSaveCopy;

  /// Whether any notice shows.
  static bool shows({
    required ProgramOperationOutboxSummary outbox,
    DateTime? savedAt,
    String? errorMessage,
  }) => savedAt != null || outbox.entries.isNotEmpty || errorMessage != null;

  @override
  Widget build(BuildContext context) {
    return CatchStack(
      gap: CatchStackGap.g8,
      children: [
        if (savedAt case final saved?) StaffSnapshotNotice(savedAt: saved),
        if (outbox.entries.isNotEmpty)
          StaffOutboxNotice(
            outbox: outbox,
            busy: busy,
            onSync: onSync,
            onReview: onReview,
          ),
        if (errorMessage case final message?)
          StaffOutboxErrorNotice(
            message: message,
            onRetry: busy ? null : onSync,
            onSaveCopy: onSaveCopy,
          ),
      ],
    );
  }
}
