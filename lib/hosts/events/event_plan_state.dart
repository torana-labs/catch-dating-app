import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/foundation.dart';

/// Where the plan screen is: reading, the event has no plan yet, showing
/// it, or unable to read it.
enum HostEventPlanStatus { loading, noPlan, ready, error }

/// The night's options the plan saves.
enum HostEventPlanOption { introductions, openers, answersPair }

/// One step of the night's plan with the clock time it starts.
@immutable
class HostEventPlanStep {
  const HostEventPlanStep({required this.step, required this.startsAt});

  final EventRunOfShowStep step;
  final DateTime startsAt;
}

/// Everything the plan screen shows, as plain values.
@immutable
class HostEventPlanState {
  const HostEventPlanState({
    required this.status,
    this.eventTitle,
    this.plan,
    this.format = CatchFormat.games,
    this.formatLabel = '',
    this.playbookTitle = '',
    this.steps = const <HostEventPlanStep>[],
    this.unitKind = EventSuccessUnitKind.wholeGroup,
    this.unitSize,
    this.unitCount,
    this.options = const <HostEventPlanOption, bool>{},
    this.editable = false,
    this.stepsEditable = false,
    this.liveControlRevision = 0,
    this.error,
  });

  const HostEventPlanState.loading()
    : this(status: HostEventPlanStatus.loading);

  final HostEventPlanStatus status;
  final String? eventTitle;

  /// The saved plan, the base of the next save.
  final EventSuccessPlan? plan;
  final CatchFormat format;
  final String formatLabel;

  /// The format's name for the night, from the plan's playbook.
  final String playbookTitle;
  final List<HostEventPlanStep> steps;
  final EventSuccessUnitKind unitKind;
  final int? unitSize;
  final int? unitCount;

  /// The night's options as saved.
  final Map<HostEventPlanOption, bool> options;

  /// The plan is still being set up, so its options can change.
  final bool editable;

  /// The run of show can still change: the night is not over. Each step
  /// edit is its own command, fenced on [liveControlRevision].
  final bool stepsEditable;

  /// The plan's fence for the next step edit.
  final int liveControlRevision;
  final Object? error;

  /// Guests sit in teams or at tables.
  bool get seated =>
      unitKind != EventSuccessUnitKind.wholeGroup &&
      unitKind != EventSuccessUnitKind.pairs;

  /// The run of show as the next step edit sends it.
  List<EventSuccessPlanStep> get planSteps => [
    for (final (index, step) in steps.indexed)
      EventSuccessPlanStep.fromRunOfShow(step.step, index: index),
  ];

  DateTime? get endsAt => steps.isEmpty
      ? null
      : steps.last.startsAt.add(
          Duration(minutes: steps.last.step.durationMinutes),
        );
}
