import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_function_row.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_tab_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The programme workspace in board order: the spotlight with its four
/// numbers, the views, the households still to reply, a section per day of
/// function rows and Add a function.
class HostProgrammeBody extends StatelessWidget {
  const HostProgrammeBody({
    super.key,
    required this.state,
    required this.onView,
    required this.onOpenFunction,
    required this.onAddFunction,
    required this.onWaiting,
    required this.onRetry,
  });

  final HostProgrammeState state;
  final ValueChanged<HostProgrammeView> onView;
  final ValueChanged<OrganizerFunctionDetail> onOpenFunction;
  final VoidCallback? onAddFunction;
  final VoidCallback onWaiting;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final program = state.program;
    if (state.status != HostProgrammeStatus.ready || program == null) {
      return HostProgrammeStateBody(status: state.status, onRetry: onRetry);
    }
    final waiting = state.guests == null ? 0 : state.waitingHouseholds;
    final days = state.days;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        HostProgrammeSpotlightHeader(state: state),
        HostProgrammeTabBar(
          selected: HostProgrammeView.schedule,
          onView: onView,
        ),
        if (waiting > 0)
          CatchSection(
            children: [
              CatchIndexRow(
                key: const ValueKey<String>('host-programme-waiting'),
                marker: CatchIndexRowTone.warning,
                title: l10n.hostProgrammeWaitingTitle(count: waiting),
                subtitle: l10n.hostProgrammeWaitingBody,
                chevron: true,
                onTap: onWaiting,
              ),
            ],
          ),
        if (days.isEmpty)
          CatchSection(
            empty: l10n.hostProgrammeScheduleEmpty,
            children: const [],
          ),
        for (final (day, functions) in days)
          CatchSection(
            key: ValueKey<String>(
              'host-programme-day-${day.toIso8601String()}',
            ),
            title: AppTimeFormatters.weekdayDayMonth(day),
            children: [
              for (final function in functions)
                ProgrammeFunctionRow(
                  key: ValueKey<String>(
                    'host-programme-function-${function.functionId}',
                  ),
                  function: function,
                  replies: state.guests == null
                      ? null
                      : state.replies(function),
                  onTap: () => onOpenFunction(function),
                ),
            ],
          ),
        CatchButton(
          key: const ValueKey<String>('host-programme-add-function'),
          label: l10n.hostProgrammeAddFunction,
          variant: CatchButtonVariant.secondary,
          leading: CatchIcon(CatchIcons.add),
          fullWidth: true,
          onPressed: program.status == ProgramStatus.archived
              ? null
              : onAddFunction,
        ),
      ],
    );
  }
}

/// The programme's spotlight: its dates and kind, its name and four
/// numbers (guests, households, flying in, staff).
class HostProgrammeSpotlightHeader extends StatelessWidget {
  const HostProgrammeSpotlightHeader({super.key, required this.state});

  final HostProgrammeState state;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final program = state.program!;
    return CatchSurface(
      block: CatchSurfaceBlock.spotlight,
      color: CatchSurfaceColor.nightsOut,
      child: CatchStack(
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            justify: CatchStackJustify.between,
            gap: CatchStackGap.g8,
            children: [
              Flexible(
                child: CatchText(
                  hostProgrammeDates(l10n, program),
                  variant: CatchTextVariant.labelKicker,
                  maxLines: 1,
                ),
              ),
              CatchBadge(label: hostProgrammeKind(l10n, program.kind)),
            ],
          ),
          CatchText(program.title, variant: CatchTextVariant.displayLg),
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              CatchMetricTile.stat(
                label: l10n.hostProgrammeStatGuests,
                value: '${state.count('guests')}',
                mode: CatchMetricTileMode.plain,
              ),
              CatchMetricTile.stat(
                label: l10n.hostProgrammeStatHouseholds,
                value: '${state.count('households')}',
                mode: CatchMetricTileMode.plain,
              ),
              CatchMetricTile.stat(
                label: l10n.hostProgrammeStatFlying,
                value: '${state.count('inboundLegs')}',
                mode: CatchMetricTileMode.plain,
              ),
              CatchMetricTile.stat(
                label: l10n.hostProgrammeStatStaff,
                value: '${state.count('activeStaff')}',
                mode: CatchMetricTileMode.plain,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// "12 to 14 December", or one day.
String hostProgrammeDates(
  AppLocalizations l10n,
  OrganizerProgramSettings program,
) {
  final start = program.startsAt;
  final end = program.endsAt;
  final last = '${end.day} ${AppTimeFormatters.longMonth(end)}';
  if (start.year == end.year &&
      start.month == end.month &&
      start.day == end.day) {
    return last;
  }
  final first = start.month == end.month
      ? '${start.day}'
      : '${start.day} ${AppTimeFormatters.longMonth(start)}';
  return l10n.hostProgrammeDates(from: first, to: last);
}

String hostProgrammeKind(AppLocalizations l10n, ProgramKind kind) =>
    switch (kind) {
      ProgramKind.wedding => l10n.hostProgrammeKindWedding,
      ProgramKind.corporate => l10n.hostProgrammeKindCorporate,
      ProgramKind.social => l10n.hostProgrammeKindSocial,
      ProgramKind.other => l10n.hostProgrammeKindOther,
    };
