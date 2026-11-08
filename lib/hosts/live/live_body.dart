import 'package:catch_dating_app/contexts/live/parts/live_need_row.dart';
import 'package:catch_dating_app/contexts/live/parts/live_plan_step_row.dart';
import 'package:catch_dating_app/contexts/live/parts/live_score_row.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// The live console's views: the night now, the door, the scoreboard and,
/// on a tablet, the room.
enum HostLiveView { now, guests, scores, room }

/// The live console in board order. On a phone one column: the views, the
/// step spotlight, its actions, the room and team stats, Needs you now,
/// tonight's plan and Message everyone. On an expanded window the
/// operations layout: the stage (spotlight, actions and the scores in two
/// columns) beside the side pane (views, stats, needs and the plan).
class HostLiveBody extends StatelessWidget {
  const HostLiveBody({
    super.key,
    required this.state,
    required this.now,
    required this.onView,
    required this.onNext,
    required this.onBack,
    required this.onFinish,
    required this.onOpenNeed,
    required this.onAllNeeds,
    required this.onEnterScores,
    required this.onMessage,
    required this.onRetry,
    this.changingStep = false,
  });

  final HostLiveState state;

  /// The clock the step's time left and the plan read from.
  final DateTime now;
  final ValueChanged<HostLiveView> onView;
  final VoidCallback onNext;
  final VoidCallback onBack;
  final VoidCallback onFinish;
  final ValueChanged<HostLiveNeed> onOpenNeed;
  final VoidCallback onAllNeeds;
  final VoidCallback onEnterScores;
  final VoidCallback onMessage;
  final VoidCallback onRetry;

  /// A step command is on its way.
  final bool changingStep;

  /// Needs you now shows this many rows; All N opens the rest.
  static const int needsShown = 2;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final expanded =
        CatchRootScope.sizeClassOf(context) == CatchWindowSize.expanded;
    switch (state.status) {
      case HostLiveStatus.loading:
        return const CatchPageBody(child: CatchLoadingIndicator());
      case HostLiveStatus.error:
        return CatchPageBody(
          child: CatchErrorState(
            title: l10n.hostLiveErrorTitle,
            message: l10n.hostLiveErrorBody,
            retryLabel: l10n.hostLiveRetry,
            onRetry: onRetry,
          ),
        );
      case HostLiveStatus.noPlan:
        return CatchPageBody(
          child: CatchEmptyState(
            icon: CatchIcons.rules,
            title: l10n.hostLiveNoPlanTitle,
            message: l10n.hostLiveNoPlanBody,
            actions: [
              CatchButton(
                label: l10n.hostLiveMessageEveryone,
                variant: CatchButtonVariant.secondary,
                onPressed: onMessage,
              ),
            ],
          ),
        );
      case HostLiveStatus.running || HostLiveStatus.finished:
        break;
    }

    final views = HostLiveViewTabBar(
      scores: state.scores && !expanded,
      room: state.room && expanded,
      onView: onView,
    );
    final spotlight = _HostLiveSpotlight(
      state: state,
      now: now,
      expanded: expanded,
    );
    final actions =
        state.status == HostLiveStatus.finished || state.steps.isEmpty
        ? null
        : _HostLiveStepActions(
            state: state,
            changingStep: changingStep,
            onNext: onNext,
            onBack: onBack,
            onFinish: onFinish,
          );
    final stats = _HostLiveStats(state: state);
    final needs = CatchSection(
      title: l10n.hostLiveNeedsTitle,
      note: state.needsChecking ? l10n.hostLiveNeedsChecking : null,
      action: state.needs.length > needsShown
          ? CatchSectionAction(
              label: l10n.hostLiveNeedsAll(count: state.needs.length),
              onPressed: onAllNeeds,
            )
          : null,
      empty: state.needsChecking ? null : l10n.hostLiveNeedsEmpty,
      children: [
        for (final need in state.needs.take(needsShown))
          HostLiveNeedRow(
            key: ValueKey<String>('host-live-need-${need.id}'),
            need: need,
            now: now,
            density: expanded
                ? CatchIndexRowSize.compact
                : CatchIndexRowSize.roomy,
            onAction: () => onOpenNeed(need),
          ),
      ],
    );
    final plan = CatchSection(
      title: l10n.hostLivePlanTitle,
      timeline: true,
      dividers: expanded
          ? CatchSectionPlacement.none
          : CatchSectionPlacement.between,
      children: [
        for (final (index, step) in state.steps.indexed)
          LivePlanStepRow(
            key: ValueKey<String>('host-live-step-$index'),
            step: step.step,
            startsAt: step.startsAt,
            status: step.status,
            format: state.format,
          ),
      ],
    );
    final message = CatchButton(
      label: l10n.hostLiveMessageEveryone,
      leading: CatchIcon(CatchIcons.chat, size: CatchIconSize.md),
      variant: CatchButtonVariant.secondary,
      fullWidth: true,
      onPressed: onMessage,
    );

    if (expanded) {
      final scores = state.scores
          ? CatchSection(
              title: state.scoredRounds == 0
                  ? l10n.hostLiveScoresTitle
                  : l10n.hostLiveScoresAfter(round: state.scoredRounds),
              action: CatchSectionAction(
                label: l10n.hostLiveScoresEnter(round: state.scoredRounds + 1),
                onPressed: onEnterScores,
              ),
              columns: 2,
              empty: l10n.hostLiveScoresNone,
              children: [
                for (final entry in state.standings)
                  LiveScoreRow(
                    key: ValueKey<String>('host-live-score-${entry.unitId}'),
                    entry: entry,
                  ),
              ],
            )
          : null;
      return CatchPageBody(
        child: CatchPaneLayout(
          pattern: CatchPaneLayoutMode.operations,
          children: [
            CatchScrollView(
              primary: false,
              child: CatchStack(
                gap: CatchStackGap.g20,
                children: [spotlight, ?actions, ?scores, message],
              ),
            ),
            CatchScrollView(
              primary: false,
              child: CatchStack(
                gap: CatchStackGap.g20,
                children: [views, stats, needs, plan],
              ),
            ),
          ],
        ),
      );
    }
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [views, spotlight, ?actions, stats, needs, plan, message],
      ),
    );
  }
}

/// Now, Guests and Scores on a phone; Now, Guests and Room on a tablet.
class HostLiveViewTabBar extends StatelessWidget {
  const HostLiveViewTabBar({
    super.key,
    required this.onView,
    this.selected = HostLiveView.now,
    this.scores = false,
    this.room = false,
  });

  final HostLiveView selected;
  final bool scores;
  final bool room;
  final ValueChanged<HostLiveView> onView;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchPageTabBar<HostLiveView>.segmented(
      selected: selected,
      label: l10n.hostLiveViewsLabel,
      options: [
        CatchOption(value: HostLiveView.now, label: l10n.hostLiveViewNow),
        CatchOption(value: HostLiveView.guests, label: l10n.hostLiveViewGuests),
        if (scores)
          CatchOption(
            value: HostLiveView.scores,
            label: l10n.hostLiveViewScores,
          ),
        if (room)
          CatchOption(value: HostLiveView.room, label: l10n.hostLiveViewRoom),
      ],
      onChanged: (view) {
        if (view != selected) onView(view);
      },
    );
  }
}

/// One need as its row: a help request, a late arrival or a message.
class HostLiveNeedRow extends StatelessWidget {
  const HostLiveNeedRow({
    super.key,
    required this.need,
    required this.now,
    required this.onAction,
    this.density = CatchIndexRowSize.roomy,
  });

  final HostLiveNeed need;
  final DateTime now;
  final VoidCallback? onAction;
  final CatchIndexRowSize density;

  @override
  Widget build(BuildContext context) => switch (need) {
    HostLiveHelpNeed(:final request) => LiveCaseRow(
      request: request,
      now: now,
      density: density,
      onAction: onAction ?? () {},
    ),
    HostLiveArrivalNeed(:final arrival) => LiveArrivalRow(
      arrival: arrival,
      density: density,
      onAction: onAction,
    ),
    HostLiveDeliveryNeed(:final delivery) => LiveDeliveryRow(
      delivery: delivery,
      density: density,
      onAction: onAction ?? () {},
    ),
  };
}

/// The step running now in the format colour: where it sits in the plan,
/// the time left, its title and note, the time-in-step meter and what
/// guests see on their phones.
class _HostLiveSpotlight extends StatelessWidget {
  const _HostLiveSpotlight({
    required this.state,
    required this.now,
    required this.expanded,
  });

  final HostLiveState state;
  final DateTime now;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final step = state.activeStep;
    final total = state.steps.length;
    final finished = state.status == HostLiveStatus.finished;
    final beforeStart =
        step != null && state.activeIndex == 0 && now.isBefore(step.startsAt);
    final String kicker;
    final String? clock;
    final double progress;
    if (step == null || finished) {
      kicker = l10n.hostLiveFinishedKicker(total: total);
      clock = null;
      progress = 1;
    } else if (beforeStart) {
      kicker = l10n.hostLiveStepKickerFirst(total: total);
      clock = l10n.hostLiveStepStarts(
        time: AppTimeFormatters.time(step.startsAt),
      );
      progress = 0;
    } else {
      kicker = l10n.hostLiveStepKicker(
        index: state.activeIndex + 1,
        total: total,
      );
      final left = step.endsAt.difference(now);
      clock = left.isNegative
          ? l10n.hostLiveStepOver(time: _clock(-left))
          : l10n.hostLiveStepLeft(time: _clock(left));
      final length = step.endsAt.difference(step.startsAt).inSeconds;
      progress = length <= 0
          ? 1
          : (now.difference(step.startsAt).inSeconds / length).clamp(0, 1);
    }
    return CatchSurface(
      block: CatchSurfaceBlock.spotlight,
      color: _spotlightColor(state.format),
      child: CatchStack(
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            justify: CatchStackJustify.between,
            gap: CatchStackGap.g8,
            children: [
              Flexible(
                child: CatchText(
                  kicker,
                  variant: CatchTextVariant.labelKicker,
                  maxLines: 1,
                ),
              ),
              if (clock != null)
                CatchText(
                  clock,
                  variant: CatchTextVariant.labelKicker,
                  numeric: true,
                ),
            ],
          ),
          CatchText(
            finished || step == null
                ? l10n.hostLiveFinishedTitle
                : step.step.title,
            variant: expanded
                ? CatchTextVariant.displayHero
                : CatchTextVariant.displayLg,
          ),
          CatchText(
            finished || step == null
                ? l10n.hostLiveFinishedNote
                : step.step.hostInstruction,
            variant: expanded
                ? CatchTextVariant.bodyLead
                : CatchTextVariant.body,
          ),
          CatchMeter(
            value: progress * 100,
            label: l10n.hostLiveStepMeter,
            size: expanded ? CatchMeterSize.lg : CatchMeterSize.md,
          ),
          if (!finished && step != null && !expanded)
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              align: CatchStackAlign.center,
              children: [
                CatchIcon(CatchIcons.mobile, size: CatchIconSize.xs),
                Flexible(
                  child: CatchText(
                    step.step.attendeeExperience,
                    variant: CatchTextVariant.labelKicker,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  static String _clock(Duration value) {
    final minutes = value.inMinutes;
    final seconds = value.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  static CatchSurfaceColor _spotlightColor(CatchFormat format) =>
      switch (format) {
        CatchFormat.run => CatchSurfaceColor.run,
        CatchFormat.dinner => CatchSurfaceColor.dinner,
        CatchFormat.games => CatchSurfaceColor.games,
        CatchFormat.courts => CatchSurfaceColor.courts,
        CatchFormat.nightsOut => CatchSurfaceColor.nightsOut,
      };
}

/// Back a step and Next, or Finish the night on the last step.
class _HostLiveStepActions extends StatelessWidget {
  const _HostLiveStepActions({
    required this.state,
    required this.changingStep,
    required this.onNext,
    required this.onBack,
    required this.onFinish,
  });

  final HostLiveState state;
  final bool changingStep;
  final VoidCallback onNext;
  final VoidCallback onBack;
  final VoidCallback onFinish;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final next = state.nextStep;
    final status = changingStep
        ? CatchButtonStatus.loading
        : CatchButtonStatus.idle;
    return CatchStack(
      direction: CatchStackDirection.row,
      gap: CatchStackGap.g8,
      children: [
        if (state.activeIndex > 0)
          CatchButton(
            label: l10n.hostLiveBackStep,
            variant: CatchButtonVariant.secondary,
            onPressed: changingStep ? null : onBack,
          ),
        Expanded(
          child: CatchButton(
            label: next == null
                ? l10n.hostLiveFinish
                : l10n.hostLiveNext(step: next.step.title),
            fullWidth: true,
            status: status,
            onPressed: changingStep
                ? null
                : next == null
                ? onFinish
                : onNext,
          ),
        ),
      ],
    );
  }
}

/// In the room against the places, and the teams with the leader once a
/// round is scored (or who is still to come when the night has no teams).
class _HostLiveStats extends StatelessWidget {
  const _HostLiveStats({required this.state});

  final HostLiveState state;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final format = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toLanguageTag(),
    );
    final waiting = state.booked - state.checkedIn;
    return CatchStack(
      direction: CatchStackDirection.row,
      equal: true,
      children: [
        CatchMetricTile.stat(
          label: l10n.hostLiveStatInRoom,
          value: format.format(state.checkedIn),
          note: state.places > 0
              ? l10n.hostLiveStatPlaces(count: state.places)
              : null,
          noteTone: CatchMetricTileTone.success,
        ),
        if (state.teams > 0)
          CatchMetricTile.stat(
            label: l10n.hostLiveStatTeams,
            value: format.format(state.teams),
            note: switch (state.leader) {
              final leader? => l10n.hostLiveStatLeads(name: leader),
              null => null,
            },
          )
        else
          CatchMetricTile.stat(
            label: l10n.hostLiveStatNotHere,
            value: format.format(waiting < 0 ? 0 : waiting),
            note: l10n.hostLiveStatBooked(count: state.booked),
          ),
      ],
    );
  }
}
