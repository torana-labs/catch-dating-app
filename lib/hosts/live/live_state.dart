import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/live/parts/live_plan_step_row.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/foundation.dart';

/// Where the console is: still reading, no saved plan for tonight, running
/// the plan, the plan marked complete, or unable to read the plan.
enum HostLiveStatus { loading, noPlan, running, finished, error }

/// One step of tonight's plan with its place on the clock.
@immutable
class HostLivePlanStep {
  const HostLivePlanStep({
    required this.step,
    required this.startsAt,
    required this.status,
  });

  final EventRunOfShowStep step;
  final DateTime startsAt;
  final LivePlanStepStatus status;

  DateTime get endsAt => startsAt.add(Duration(minutes: step.durationMinutes));
}

/// One thing that needs the host now, in the order the console shows it.
@immutable
sealed class HostLiveNeed {
  const HostLiveNeed();

  /// Stable across rebuilds, for row keys.
  String get id;
}

/// A guest asked for help.
final class HostLiveHelpNeed extends HostLiveNeed {
  const HostLiveHelpNeed(this.request);

  final AssistanceOpenHostCase request;

  @override
  String get id => 'help-${request.scope.caseId}';
}

/// A guest checked in after the start and has no place in the next round.
final class HostLiveArrivalNeed extends HostLiveNeed {
  const HostLiveArrivalNeed(this.arrival);

  final EventSuccessLateArrivalCandidate arrival;

  @override
  String get id => 'arrival-${arrival.uid}';
}

/// A message a guest did not get waits on the host.
final class HostLiveDeliveryNeed extends HostLiveNeed {
  const HostLiveDeliveryNeed(this.delivery);

  final AssistanceActionableDelivery delivery;

  @override
  String get id => 'delivery-${delivery.scope.messageId}';
}

/// The formats board tonight's format runs on, opened from the console's
/// views: the court board for court rotations, team mixing for teams.
/// The formats board a night opens from Live: courts, team mixing, the
/// crawl's stops, or pace pods.
enum HostLiveFormatView { courts, mix, crawl, pods }

/// One team or table and how many of its places are taken.
@immutable
class HostLiveUnit {
  const HostLiveUnit({required this.label, required this.seated, this.size});

  final String label;
  final int seated;

  /// The places the plan gives each unit; null when the plan sets none.
  final int? size;
}

/// Everything the live console shows, as plain values.
@immutable
class HostLiveState {
  const HostLiveState({
    required this.status,
    this.format = CatchFormat.games,
    this.steps = const <HostLivePlanStep>[],
    this.activeIndex = 0,
    this.liveControlRevision = 0,
    this.checkedIn = 0,
    this.booked = 0,
    this.places = 0,
    this.teams = 0,
    this.leader,
    this.needs = const <HostLiveNeed>[],
    this.needsChecking = false,
    this.standings = const <EventSuccessStandingEntry>[],
    this.scoredRounds = 0,
    this.scores = false,
    this.units = const <HostLiveUnit>[],
    this.presenceRevision = 0,
    this.formatView,
    this.stepStartedAt,
    this.pausedAt,
    this.error,
  });

  const HostLiveState.loading() : this(status: HostLiveStatus.loading);

  final HostLiveStatus status;

  /// The event's format colour: the spotlight and the live step's marker.
  final CatchFormat format;
  final List<HostLivePlanStep> steps;
  final int activeIndex;

  /// The plan's fence for the next step command.
  final int liveControlRevision;
  final int checkedIn;
  final int booked;

  /// The event's capacity.
  final int places;

  /// Teams or tables tonight; zero when the format has none.
  final int teams;

  /// The team in first place once a round is scored.
  final String? leader;
  final List<HostLiveNeed> needs;

  /// A needs source has not answered yet, so an empty list is not an
  /// all-clear.
  final bool needsChecking;

  /// The scoreboard after the last scored round, first place first.
  final List<EventSuccessStandingEntry> standings;
  final int scoredRounds;

  /// The format keeps score, so Scores is one of the views.
  final bool scores;

  /// The teams or tables and who sits at each, for the room view.
  final List<HostLiveUnit> units;

  /// The presence summary's fence for placing a late arrival.
  final int presenceRevision;

  /// The formats board this night has; null when it has none.
  final HostLiveFormatView? formatView;

  /// When the active step started by the server's clock, moved later by
  /// any pause; null when the plan predates it, so time left follows the
  /// schedule.
  final DateTime? stepStartedAt;

  /// When the active step was paused; null while it runs.
  final DateTime? pausedAt;
  final Object? error;

  /// The active step's clock is stopped.
  bool get paused => pausedAt != null;

  /// When the active step ends: its start plus its minutes when the plan
  /// knows the start, otherwise its place on the schedule.
  DateTime? get activeStepEndsAt {
    final step = activeStep;
    if (step == null) return null;
    final started = stepStartedAt;
    return started == null
        ? step.endsAt
        : started.add(Duration(minutes: step.step.durationMinutes));
  }

  /// Guests sit in teams or at tables, so the tablet offers the room.
  bool get room => units.isNotEmpty;

  HostLivePlanStep? get activeStep =>
      steps.isEmpty ? null : steps[activeIndex.clamp(0, steps.length - 1)];

  HostLivePlanStep? get nextStep =>
      activeIndex + 1 < steps.length ? steps[activeIndex + 1] : null;

  bool get lastStep => steps.isNotEmpty && activeIndex >= steps.length - 1;
}
