import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The work this phone holds for a programme and has not sent yet: how many
/// changes wait and how many the server refused, with Send now and, when
/// something was refused, Look at them.
class StaffOutboxNotice extends StatelessWidget {
  const StaffOutboxNotice({
    super.key,
    required this.outbox,
    required this.busy,
    required this.onSync,
    required this.onReview,
  });

  final ProgramOperationOutboxSummary outbox;

  /// A send is on its way; the buttons wait for it.
  final bool busy;
  final VoidCallback onSync;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final review = outbox.needsReviewCount;
    return CatchNotice.inline(
      key: const ValueKey<String>('staff-outbox-notice'),
      tone: review > 0 ? CatchNoticeTone.danger : CatchNoticeTone.warning,
      icon: CatchIcons.offline,
      title: l10n.hostStaffOutboxTitle,
      body: review > 0
          ? l10n.hostStaffOutboxReview(
              pending: outbox.pendingCount,
              review: review,
            )
          : l10n.hostStaffOutboxPending(count: outbox.pendingCount),
      footer: CatchStack(
        direction: CatchStackDirection.row,
        gap: CatchStackGap.g8,
        wrap: true,
        children: [
          CatchButton(
            label: l10n.hostStaffOutboxSend,
            size: CatchButtonSize.md,
            status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
            onPressed: busy ? null : onSync,
          ),
          if (review > 0)
            CatchButton(
              label: l10n.hostStaffOutboxLook,
              size: CatchButtonSize.md,
              variant: CatchButtonVariant.quiet,
              onPressed: busy ? null : onReview,
            ),
        ],
      ),
    );
  }
}

/// A command or the local journal failed: what went wrong, Try again, and
/// Save a copy when the phone could not read its own saved work.
class StaffOutboxErrorNotice extends StatelessWidget {
  const StaffOutboxErrorNotice({
    super.key,
    required this.message,
    required this.onRetry,
    this.onSaveCopy,
  });

  final String message;
  final VoidCallback? onRetry;

  /// Exports the work this phone kept; null when the journal is readable.
  final VoidCallback? onSaveCopy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchNotice.inline(
      key: const ValueKey<String>('staff-outbox-error'),
      tone: CatchNoticeTone.danger,
      icon: CatchIcons.warning,
      body: message,
      footer: CatchStack(
        direction: CatchStackDirection.row,
        gap: CatchStackGap.g8,
        wrap: true,
        children: [
          CatchButton(
            label: l10n.hostStaffTryAgain,
            size: CatchButtonSize.md,
            variant: CatchButtonVariant.secondary,
            onPressed: onRetry,
          ),
          if (onSaveCopy case final save?)
            CatchButton(
              label: l10n.hostStaffOutboxSaveCopy,
              size: CatchButtonSize.md,
              variant: CatchButtonVariant.quiet,
              onPressed: save,
            ),
        ],
      ),
    );
  }
}

/// The screen shows what this phone saved earlier because it is offline,
/// with the time it was saved.
class StaffSnapshotNotice extends StatelessWidget {
  const StaffSnapshotNotice({super.key, required this.savedAt});

  final DateTime savedAt;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchNotice.inline(
      key: const ValueKey<String>('staff-snapshot-notice'),
      tone: CatchNoticeTone.warning,
      icon: CatchIcons.offline,
      title: l10n.hostStaffSnapshotTitle,
      body: l10n.hostStaffSnapshotBody(
        time: AppTimeFormatters.time(savedAt.toLocal()),
      ),
    );
  }
}
