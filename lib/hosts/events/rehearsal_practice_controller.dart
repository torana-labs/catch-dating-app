import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_membership.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_adapter.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_moving_night.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_controller.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'rehearsal_practice_controller.g.dart';

/// The practice console, composed from the rehearsal session read alone.
/// Nothing here reads or writes a real event: the rehearsal's projection
/// (its made-up guests, plan and virtual clock) feeds the same state
/// builders the live listeners use.
@riverpod
HostRehearsalPracticeState hostRehearsalPracticeController(
  Ref ref,
  String sessionId,
) {
  final value = ref.watch(eventRehearsalProvider(sessionId));
  final rehearsal = value.value;
  if (rehearsal == null) {
    return switch (value) {
      AsyncValue(:final error?) => HostRehearsalPracticeState(
        status: HostRehearsalPracticeStatus.error,
        error: error,
      ),
      _ => const HostRehearsalPracticeState.loading(),
    };
  }
  return hostRehearsalPracticeState(rehearsal);
}

/// The practice console from one rehearsal read: the rebuilt console the
/// rehearsed night runs on, and that console's state.
HostRehearsalPracticeState hostRehearsalPracticeState(
  EventRehearsalBootstrap rehearsal,
) {
  final projection = buildEventRehearsalRuntimeProjection(
    rehearsal,
    practiceGuestLabel: '',
    latePracticeGuestLabel: '',
  );
  final event = projection.event;
  final plan = projection.plan;
  final console = hostLiveConsoleFits(event)
      ? HostRehearsalPracticeConsole.live
      : switch (hostMovingNightView(event)) {
          HostMovingNightView.run => HostRehearsalPracticeConsole.run,
          HostMovingNightView.crawl => HostRehearsalPracticeConsole.crawl,
          null => HostRehearsalPracticeConsole.live,
        };
  final attendees = projection.attendees;
  final runners = attendees.where((a) => a.isCheckedIn).toList();
  final facts = <String, AssistanceMembershipFacts?>{
    for (final row
        in rehearsal.membershipReviews?.rows ??
            const <RehearsalMembershipRow>[])
      row.scope.actorId: row.facts,
  };
  final sweep = hostFormatsSweepState(
    event: event,
    attendees: attendees,
    plan: plan,
  );
  return HostRehearsalPracticeState(
    status: HostRehearsalPracticeStatus.ready,
    console: console,
    rehearsal: rehearsal,
    event: event,
    live: hostLiveState(
      event: event,
      plan: plan,
      roster: projection.roster,
      standings: projection.standings,
      assignments: projection.assignments,
      presence: projection.presence,
      boards: false,
    ),
    scores: hostLiveScoresState(
      event: event,
      plan: plan,
      standings: projection.standings,
      assignments: projection.assignments,
      attendees: attendees,
    ),
    run: hostFormatsRunState(
      event: event,
      plan: plan,
      sweep: sweep,
      // Only runners the rehearsal placed in a pace group count in pods; a
      // rehearsal without groups shows the step and the sweep.
      runners: [
        for (final runner in runners)
          if (facts.containsKey(runner.id)) runner,
      ],
      memberships: facts,
    ),
    crawl: hostFormatsCrawlState(
      event: event,
      host: rehearsal.session.setup.locationName,
      attendees: attendees,
      plan: plan,
    ),
  );
}
