import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_adapter.dart';
import 'package:catch_dating_app/hosts/events/parts/host_event_step_row.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'rehearsal_controller.g.dart';

/// The rehearsal screen, composed from the rehearsal session read: its
/// event's name, its made-up guests and the plan's steps up to the one
/// being practised. The rehearsal's own state machine moves the steps.
@riverpod
HostRehearsalState hostRehearsalController(Ref ref, String sessionId) {
  final value = ref.watch(eventRehearsalProvider(sessionId));
  final rehearsal = value.value;
  if (rehearsal == null) {
    return switch (value) {
      AsyncValue(:final error?) => HostRehearsalState(
        status: HostRehearsalStatus.error,
        error: error,
      ),
      _ => const HostRehearsalState.loading(),
    };
  }
  final session = rehearsal.session;
  final ended =
      session.status == EventRehearsalStatus.complete ||
      session.status == EventRehearsalStatus.expired;
  final projection = buildEventRehearsalRuntimeProjection(
    rehearsal,
    practiceGuestLabel: '',
    latePracticeGuestLabel: '',
  );
  final runOfShow = EventSuccessRuntime(
    plan: projection.plan,
    event: projection.event,
    now: projection.event.startTime,
  ).runOfShowSteps;
  final started =
      session.status != EventRehearsalStatus.draft &&
      session.status != EventRehearsalStatus.ready;
  return HostRehearsalState(
    status: ended ? HostRehearsalStatus.ended : HostRehearsalStatus.running,
    title: session.setup.title,
    guests: session.actorCount,
    steps: List<HostRehearsalStep>.unmodifiable([
      for (final (index, step) in runOfShow.indexed)
        HostRehearsalStep(
          step: step,
          progress: ended || (started && index < session.activeStepIndex)
              ? HostEventStepProgress.done
              : index == (started ? session.activeStepIndex : 0)
              ? HostEventStepProgress.now
              : HostEventStepProgress.next,
        ),
    ]),
  );
}
