import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_plan_step_controller.g.dart';

/// One run-of-show edit as the plan screen asks for it.
sealed class HostEventPlanStepEdit {
  const HostEventPlanStepEdit();
}

/// A new step at [atIndex].
final class HostEventPlanStepAdd extends HostEventPlanStepEdit {
  const HostEventPlanStepAdd(this.step, {required this.atIndex});

  final EventSuccessPlanStep step;
  final int atIndex;
}

/// The step with [step]'s id, changed.
final class HostEventPlanStepChange extends HostEventPlanStepEdit {
  const HostEventPlanStepChange(this.step);

  final EventSuccessPlanStep step;
}

/// The step with [stepId] taken out of the plan.
final class HostEventPlanStepRemove extends HostEventPlanStepEdit {
  const HostEventPlanStepRemove(this.stepId);

  final String stepId;
}

/// The run-of-show step edits the plan screen commits, each through
/// `saveEventPlanStep`. None invalidates a read: the plan listener delivers
/// the saved steps.
@riverpod
class HostEventPlanCommands extends _$HostEventPlanCommands {
  static final saveStepMutation = Mutation<void>();

  @override
  void build() {}

  /// Saves [edit] on the plan, fenced on [expectedLiveControlRevision].
  /// [currentSteps] are the steps the host sees; the server reads them only
  /// for the first edit of a plan still on its playbook. [requestId] keeps
  /// a retry of the same edit from applying twice.
  Future<void> saveStep({
    required String eventId,
    required String requestId,
    required int expectedLiveControlRevision,
    required List<EventSuccessPlanStep> currentSteps,
    required bool hasOverrides,
    required HostEventPlanStepEdit edit,
  }) async {
    requireSignedInUid(ref, action: 'change the plan');
    final repository = ref.read(eventSuccessRepositoryProvider);
    final baseSteps = hasOverrides || currentSteps.isEmpty
        ? null
        : currentSteps;
    switch (edit) {
      case HostEventPlanStepAdd(:final step, :final atIndex):
        await repository.saveEventPlanStep(
          eventId: eventId,
          requestId: requestId,
          expectedLiveControlRevision: expectedLiveControlRevision,
          op: EventSuccessPlanStepOp.add,
          step: step,
          atIndex: atIndex,
          baseSteps: baseSteps,
        );
      case HostEventPlanStepChange(:final step):
        await repository.saveEventPlanStep(
          eventId: eventId,
          requestId: requestId,
          expectedLiveControlRevision: expectedLiveControlRevision,
          op: EventSuccessPlanStepOp.edit,
          step: step,
          baseSteps: baseSteps,
        );
      case HostEventPlanStepRemove(:final stepId):
        await repository.saveEventPlanStep(
          eventId: eventId,
          requestId: requestId,
          expectedLiveControlRevision: expectedLiveControlRevision,
          op: EventSuccessPlanStepOp.remove,
          stepId: stepId,
          baseSteps: baseSteps,
        );
    }
  }
}
