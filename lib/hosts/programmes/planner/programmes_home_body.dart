import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Where the planner home is: reading, showing, or unable to read.
enum HostProgrammesHomeStatus { loading, ready, error }

/// The planner home (RbProgHome): totals across the organiser's
/// programmes and one row per programme with its replies bar.
class HostProgrammesHomeBody extends StatelessWidget {
  const HostProgrammesHomeBody({
    super.key,
    required this.status,
    required this.programmes,
    required this.now,
    required this.onOpen,
    required this.onNew,
    required this.onRetry,
  });

  final HostProgrammesHomeStatus status;
  final List<OrganizerProgramListRow> programmes;
  final DateTime now;
  final ValueChanged<OrganizerProgramListRow> onOpen;
  final VoidCallback? onNew;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (status) {
      case HostProgrammesHomeStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case HostProgrammesHomeStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostProgrammeErrorTitle,
            message: l10n.hostProgrammeErrorBody,
            retryLabel: l10n.hostProgrammeRetry,
            onRetry: onRetry,
          ),
        );
      case HostProgrammesHomeStatus.ready:
        break;
    }
    final active = [
      for (final row in programmes)
        if (!row.isArchived) row,
    ];
    final guests = active.fold<int>(0, (sum, r) => sum + (r.guestCount ?? 0));
    final flying = active.fold<int>(
      0,
      (sum, r) => sum + (r.flyingInCount ?? 0),
    );
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostProgrammesHomeStatProgrammes,
              value: '${active.length}',
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammesHomeStatGuests,
              value: '$guests',
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammesHomeStatFlying,
              value: '$flying',
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammesHomeYours,
          action: onNew == null
              ? null
              : CatchSectionAction(
                  label: l10n.hostProgrammesHomeNew,
                  onPressed: onNew,
                ),
          empty: l10n.hostProgrammesHomeEmpty,
          children: [
            for (final row in programmes)
              HostProgrammesHomeRow(
                key: ValueKey<String>('host-programmes-home-${row.programId}'),
                programme: row,
                now: now,
                onTap: () => onOpen(row),
              ),
          ],
        ),
      ],
    );
  }
}

/// One programme: its date, name, guests and flights, how soon it is, and
/// how many guests replied.
class HostProgrammesHomeRow extends StatelessWidget {
  const HostProgrammesHomeRow({
    super.key,
    required this.programme,
    required this.now,
    required this.onTap,
  });

  final OrganizerProgramListRow programme;
  final DateTime now;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final startsAt = programme.startsAt;
    final endsAt = programme.endsAt;
    final today = DateTime(now.year, now.month, now.day);
    final days = startsAt?.difference(today).inDays;
    final replied = programme.repliedShare;
    return CatchIndexRow(
      title: programme.title,
      onTap: onTap,
      date: startsAt == null
          ? null
          : CatchIndexRowDate(
              day: '${startsAt.day}',
              date: AppTimeFormatters.shortMonth(startsAt),
            ),
      subtitle: [
        if (programme.guestCount case final guests?)
          l10n.hostEventsProgrammeGuests(count: guests),
        if (programme.flyingInCount case final flying? when flying > 0)
          l10n.hostEventsProgrammeFlying(count: flying),
      ].join(' · '),
      status: programme.isArchived
          ? l10n.hostProgrammesHomeArchived
          : endsAt != null && endsAt.isBefore(today)
          ? l10n.hostProgrammesHomeEnded
          : days != null && days > 0
          ? l10n.hostProgrammesHomeLiveIn(count: days)
          : l10n.hostProgrammesHomeLiveNow,
      progress: replied == null
          ? null
          : CatchIndexRowProgress(
              value: (replied * 100).round(),
              label: l10n.hostProgrammesHomeReplied(
                name: programme.title,
                percent: (replied * 100).round(),
              ),
            ),
      chevron: true,
    );
  }
}
