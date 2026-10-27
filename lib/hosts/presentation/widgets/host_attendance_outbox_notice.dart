part of 'host_operational_roster_section.dart';

class HostAttendanceOutboxNotice extends StatelessWidget {
  const HostAttendanceOutboxNotice({
    super.key,
    required this.summary,
    required this.onRetry,
    required this.onDiscardConflicts,
  });

  final HostAttendanceOutboxSummary summary;
  final VoidCallback onRetry;
  final VoidCallback onDiscardConflicts;

  @override
  Widget build(BuildContext context) {
    final needsReview = summary.needsReviewCount > 0;
    return CatchSection.contained(
      title: needsReview
          ? context.l10n.hostsOperationalRosterOutboxReviewTitle
          : context.l10n.hostsOperationalRosterOutboxPendingTitle,
      subtitle: needsReview
          ? context.l10n.hostsOperationalRosterOutboxReviewBody(
              count: summary.needsReviewCount,
            )
          : context.l10n.hostsOperationalRosterOutboxPendingBody(
              count: summary.pendingCount,
            ),
      child: Wrap(
        spacing: CatchSpacing.s2,
        runSpacing: CatchSpacing.s2,
        children: [
          if (summary.pendingCount > 0)
            CatchButton(
              label: context.l10n.hostsOperationalRosterOutboxRetry,
              variant: CatchButtonVariant.secondary,
              onPressed: onRetry,
            ),
          if (needsReview)
            CatchButton(
              label: context.l10n.hostsOperationalRosterOutboxDiscard,
              variant: CatchButtonVariant.quiet,
              onPressed: onDiscardConflicts,
            ),
        ],
      ),
    );
  }
}
