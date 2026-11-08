import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_attention_row.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Where the alerts are: reading, showing, or unable to read.
enum StaffAlertsStatus { loading, content, error }

/// The alerts for the jobs this person holds, newest first, with what
/// raises one under them.
class StaffAlertsBody extends StatelessWidget {
  const StaffAlertsBody({
    super.key,
    required this.status,
    required this.now,
    required this.onRetry,
    this.feed,
  });

  final StaffAlertsStatus status;
  final ProgramStaffAttention? feed;
  final DateTime now;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (status) {
      case StaffAlertsStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffAlertsStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffAlertsErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffAlertsStatus.content:
        break;
    }
    final items = [...?feed?.items]
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchSection(
          note: feed?.truncated == true ? l10n.hostStaffAlertsTruncated : null,
          empty: l10n.hostStaffAlertsEmpty,
          children: [
            for (final item in items)
              StaffAttentionRow(
                key: ValueKey<String>('staff-alert-${item.itemId}'),
                item: item,
                now: now,
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostStaffAlertsWhatTitle,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchText(
              l10n.hostStaffAlertsWhatBody,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
      ],
    );
  }
}
