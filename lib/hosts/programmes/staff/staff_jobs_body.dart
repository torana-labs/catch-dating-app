import 'package:catch_dating_app/contexts/programmes/parts/staff_outbox_notice.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_jobs_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// A staff member's jobs in board order: the job on now as the spotlight
/// with its one button, the next function as a tile, Later, the other pages
/// this person may open and the line on what they can see and until when.
class StaffJobsBody extends StatelessWidget {
  const StaffJobsBody({
    super.key,
    required this.state,
    required this.onOpen,
    required this.onLink,
    required this.onRetry,
  });

  final StaffJobsState state;
  final ValueChanged<StaffJob> onOpen;
  final ValueChanged<StaffJobLink> onLink;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case StaffJobsStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffJobsStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffJobsErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffJobsStatus.content:
        break;
    }
    if (state.isEmpty) {
      return CatchPageBody.screen(
        child: CatchEmptyState(
          icon: CatchIcons.locked,
          title: l10n.hostStaffJobsEmptyTitle,
          message: l10n.hostStaffJobsEmptyBody,
        ),
      );
    }
    final now = state.now ?? DateTime.now();
    final next = state.next;
    final endsAt = state.accessEndsAt;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        if (state.savedAt case final savedAt?)
          StaffSnapshotNotice(savedAt: savedAt),
        if (state.onNow case final job?)
          _StaffJobSpotlight(job: job, onOpen: () => onOpen(job)),
        if (next != null && next.function != null)
          CatchSurface(
            child: CatchIndexRow(
              key: ValueKey<String>('staff-job-next-${next.placeId}'),
              title: _place(next),
              subtitle: [
                _when(l10n, next, now),
                staffJobRole(l10n, next.kind),
              ].join(' · '),
              meta: l10n.hostStaffJobsNextMeta(
                count: next.function!.expectedCount,
              ),
              chevron: true,
              onTap: () => onOpen(next),
            ),
          ),
        if (state.later.isNotEmpty)
          CatchSection(
            title: l10n.hostStaffJobsLater,
            children: [
              for (final job in state.later)
                CatchIndexRow(
                  key: ValueKey<String>(
                    'staff-job-${job.kind.name}-${job.placeId}',
                  ),
                  title: _place(job),
                  subtitle: job.function == null ? null : _when(l10n, job, now),
                  value: staffJobRole(l10n, job.kind),
                  chevron: true,
                  onTap: () => onOpen(job),
                ),
            ],
          ),
        if (state.links.isNotEmpty)
          CatchSection(
            title: l10n.hostStaffJobsAlso,
            children: [
              for (final link in state.links)
                CatchIndexRow(
                  key: ValueKey<String>('staff-link-${link.name}'),
                  title: _linkLabel(l10n, link),
                  icon: _linkIcon(link),
                  chevron: true,
                  onTap: () => onLink(link),
                ),
            ],
          ),
        CatchText(
          endsAt == null
              ? l10n.hostStaffJobsScope
              : l10n.hostStaffJobsScopeEnds(
                  date: AppTimeFormatters.longDate(endsAt.toLocal()),
                ),
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
      ],
    );
  }
}

/// The job's role as a short word: Arrivals, Dispatch, Hotel, Door, Lead.
String staffJobRole(AppLocalizations l10n, StaffJobKind kind) => switch (kind) {
  StaffJobKind.greeter => l10n.hostStaffJobsRoleGreeter,
  StaffJobKind.dispatch => l10n.hostStaffJobsRoleDispatch,
  StaffJobKind.hotel => l10n.hostStaffJobsRoleHotel,
  StaffJobKind.door => l10n.hostStaffJobsRoleDoor,
  StaffJobKind.lead => l10n.hostStaffJobsRoleLead,
};

String _place(StaffJob job) => switch (job.function?.venueName) {
  final venue? => '${job.title}, $venue',
  null => job.title,
};

String _when(AppLocalizations l10n, StaffJob job, DateTime now) {
  final function = job.function!;
  final start = function.startsAt.toLocal();
  final local = now.toLocal();
  final range = l10n.hostStaffTimeRange(
    start: AppTimeFormatters.time(start),
    end: AppTimeFormatters.time(function.endsAt.toLocal()),
  );
  final sameDay =
      start.year == local.year &&
      start.month == local.month &&
      start.day == local.day;
  return sameDay
      ? range
      : '${AppTimeFormatters.weekdayDayMonth(start)} · $range';
}

String _linkLabel(AppLocalizations l10n, StaffJobLink link) => switch (link) {
  StaffJobLink.alerts => l10n.hostStaffJobsLinkAlerts,
  StaffJobLink.messages => l10n.hostStaffJobsLinkMessages,
  StaffJobLink.inbox => l10n.hostStaffJobsLinkInbox,
  StaffJobLink.guests => l10n.hostStaffJobsLinkGuests,
  StaffJobLink.importList => l10n.hostStaffJobsLinkImport,
  StaffJobLink.phoneImport => l10n.hostStaffJobsLinkPhoneImport,
  StaffJobLink.trips => l10n.hostStaffJobsLinkTrips,
  StaffJobLink.counts => l10n.hostStaffJobsLinkCounts,
  StaffJobLink.attendance => l10n.hostStaffJobsLinkAttendance,
};

IconData _linkIcon(StaffJobLink link) => switch (link) {
  StaffJobLink.alerts => CatchIcons.notifications,
  StaffJobLink.messages => CatchIcons.magic,
  StaffJobLink.inbox => CatchIcons.conversations,
  StaffJobLink.guests => CatchIcons.people,
  StaffJobLink.importList => CatchIcons.upload,
  StaffJobLink.phoneImport => CatchIcons.addPerson,
  StaffJobLink.trips => CatchIcons.receipt,
  StaffJobLink.counts => CatchIcons.review,
  StaffJobLink.attendance => CatchIcons.review,
};

/// The job on now: since when or until when, the role, the place, a line on
/// it and the one button that opens it.
class _StaffJobSpotlight extends StatelessWidget {
  const _StaffJobSpotlight({required this.job, required this.onOpen});

  final StaffJob job;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final function = job.function;
    return CatchSurface(
      key: const ValueKey<String>('staff-job-spotlight'),
      block: CatchSurfaceBlock.spotlight,
      color: CatchSurfaceColor.ink,
      child: CatchStack(
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            justify: CatchStackJustify.between,
            align: CatchStackAlign.center,
            gap: CatchStackGap.g8,
            children: [
              CatchBadge(
                label: function == null
                    ? l10n.hostStaffJobsOnNow
                    : l10n.hostStaffJobsOnNowUntil(
                        time: AppTimeFormatters.time(function.endsAt.toLocal()),
                      ),
                dot: true,
              ),
              Flexible(
                child: CatchText(
                  staffJobTitle(l10n, job.kind),
                  variant: CatchTextVariant.labelKicker,
                  maxLines: 1,
                ),
              ),
            ],
          ),
          CatchText(_place(job), variant: CatchTextVariant.displayLg),
          if (function != null)
            CatchText(
              [
                staffFunctionWhenShort(
                  l10n,
                  function.startsAt,
                  function.endsAt,
                ),
                l10n.hostStaffFunctionCounts(
                  checkedIn: function.checkedInCount,
                  expected: function.expectedCount,
                ),
              ].join(' · '),
            ),
          CatchButton(
            key: const ValueKey<String>('staff-job-open'),
            label: switch (job.kind) {
              StaffJobKind.greeter => l10n.hostStaffJobsOpenArrivals,
              StaffJobKind.dispatch => l10n.hostStaffJobsOpenDispatch,
              StaffJobKind.hotel => l10n.hostStaffJobsOpenHotel,
              StaffJobKind.door => l10n.hostStaffJobsOpenDoor,
              StaffJobKind.lead => l10n.hostStaffJobsOpenLead,
            },
            fullWidth: true,
            onPressed: onOpen,
          ),
        ],
      ),
    );
  }
}

/// The job's full title: Airport greeter, Dispatch, Hotel desk, Door,
/// Function lead.
String staffJobTitle(AppLocalizations l10n, StaffJobKind kind) =>
    switch (kind) {
      StaffJobKind.greeter => l10n.hostStaffDutyGreeter,
      StaffJobKind.dispatch => l10n.hostStaffDutyDispatch,
      StaffJobKind.hotel => l10n.hostStaffDutyHotel,
      StaffJobKind.door => l10n.hostStaffDutyDoor,
      StaffJobKind.lead => l10n.hostStaffDutyLead,
    };

/// A start and end time: "7:30 to 11:00 PM".
String staffFunctionWhenShort(
  AppLocalizations l10n,
  DateTime start,
  DateTime end,
) => l10n.hostStaffTimeRange(
  start: AppTimeFormatters.time(start.toLocal()),
  end: AppTimeFormatters.time(end.toLocal()),
);
