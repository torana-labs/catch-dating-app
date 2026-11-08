import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/parts/host_event_step_row.dart';
import 'package:catch_dating_app/hosts/events/event_plan_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The plan for the night in board order: the format spotlight with its
/// numbers, the run of show, teams and tables, and the night's options.
/// The steps come from the format and are read here, not edited.
class HostEventPlanBody extends StatelessWidget {
  const HostEventPlanBody({
    super.key,
    required this.state,
    required this.options,
    required this.onOption,
    required this.onRetry,
  });

  final HostEventPlanState state;

  /// The night's options as the host has them now, saved or not.
  final Map<HostEventPlanOption, bool> options;
  final void Function(HostEventPlanOption option, bool on) onOption;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostEventPlanStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case HostEventPlanStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostEventsWorkspaceErrorTitle,
            message: l10n.hostEventsErrorBody,
            retryLabel: l10n.hostEventsRetry,
            onRetry: onRetry,
          ),
        );
      case HostEventPlanStatus.noPlan:
        return CatchPageBody.screen(
          child: CatchEmptyState(
            icon: CatchIcons.rules,
            title: l10n.hostEventsPlanEmptyTitle,
            message: l10n.hostEventsPlanEmptyBody,
          ),
        );
      case HostEventPlanStatus.ready:
        break;
    }
    final endsAt = state.endsAt;
    return CatchPageBody.screen(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          CatchSurface(
            block: CatchSurfaceBlock.spotlight,
            color: _surfaceColor(state.format),
            child: CatchStack(
              children: [
                CatchText(
                  l10n.hostEventsPlanKicker(format: state.formatLabel),
                  variant: CatchTextVariant.labelKicker,
                ),
                CatchText(
                  state.playbookTitle,
                  variant: CatchTextVariant.displaySm,
                ),
                CatchStack(
                  direction: CatchStackDirection.row,
                  equal: true,
                  children: [
                    if (state.seated && state.unitCount != null)
                      CatchMetricTile.stat(
                        label: l10n.hostEventsPlanUnits(
                          kind: state.unitKind.label.toLowerCase(),
                          size: state.unitSize ?? 0,
                        ),
                        value: '${state.unitCount}',
                        mode: CatchMetricTileMode.plain,
                      ),
                    CatchMetricTile.stat(
                      label: l10n.hostEventsPlanStepsLabel,
                      value: '${state.steps.length}',
                      mode: CatchMetricTileMode.plain,
                    ),
                    if (endsAt != null)
                      CatchMetricTile.stat(
                        label: l10n.hostEventsPlanEndsLabel,
                        value: EventFormatters.time(endsAt),
                        mode: CatchMetricTileMode.plain,
                      ),
                  ],
                ),
                CatchText(
                  state.editable
                      ? l10n.hostEventsPlanNoteEditable
                      : l10n.hostEventsPlanNoteLocked,
                  variant: CatchTextVariant.bodySmall,
                ),
              ],
            ),
          ),
          CatchSection(
            title: l10n.hostEventsPlanRunOfShow,
            empty: l10n.hostEventsPlanRunOfShowEmpty,
            children: [
              for (final (index, step) in state.steps.indexed)
                HostEventStepRow.plan(
                  key: ValueKey<String>('host-event-plan-step-$index'),
                  step: step.step,
                  startsAt: step.startsAt,
                ),
            ],
          ),
          if (state.seated)
            CatchSection(
              title: l10n.hostEventsPlanTeamsTitle,
              dividers: CatchSectionPlacement.none,
              children: [
                CatchText(
                  state.unitCount == null
                      ? l10n.hostEventsPlanTeamsSized(
                          kind: state.unitKind.label.toLowerCase(),
                          size: state.unitSize ?? 0,
                        )
                      : l10n.hostEventsPlanTeamsCounted(
                          count: state.unitCount!,
                          kind: state.unitKind.label.toLowerCase(),
                          size: state.unitSize ?? 0,
                        ),
                  tone: CatchTextTone.secondary,
                ),
              ],
            ),
          CatchSection(
            title: l10n.hostEventsPlanOnTheNight,
            children: [
              for (final option in HostEventPlanOption.values)
                _HostEventPlanOptionRow(
                  key: ValueKey<String>('host-event-plan-${option.name}'),
                  option: option,
                  on: options[option] ?? false,
                  onChanged: state.editable
                      ? (on) => onOption(option, on)
                      : null,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// One of the night's options as a row with its switch.
class _HostEventPlanOptionRow extends StatelessWidget {
  const _HostEventPlanOptionRow({
    super.key,
    required this.option,
    required this.on,
    required this.onChanged,
  });

  final HostEventPlanOption option;
  final bool on;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final (title, subtitle) = switch (option) {
      HostEventPlanOption.introductions => (
        l10n.hostEventsPlanIntroductions,
        l10n.hostEventsPlanIntroductionsBody,
      ),
      HostEventPlanOption.openers => (
        l10n.hostEventsPlanOpeners,
        l10n.hostEventsPlanOpenersBody,
      ),
      HostEventPlanOption.answersPair => (
        l10n.hostEventsPlanAnswersPair,
        l10n.hostEventsPlanAnswersPairBody,
      ),
    };
    return CatchIndexRow(
      title: title,
      subtitle: subtitle,
      onTap: null,
      trailing: CatchToggleInput(
        value: on,
        semanticLabel: title,
        contractExemption:
            'A live guide option saved with the plan, not a form field value.',
        onChanged: onChanged,
      ),
    );
  }
}

CatchSurfaceColor _surfaceColor(CatchFormat format) => switch (format) {
  CatchFormat.run => CatchSurfaceColor.run,
  CatchFormat.dinner => CatchSurfaceColor.dinner,
  CatchFormat.games => CatchSurfaceColor.games,
  CatchFormat.courts => CatchSurfaceColor.courts,
  CatchFormat.nightsOut => CatchSurfaceColor.nightsOut,
};
