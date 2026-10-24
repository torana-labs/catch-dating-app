import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_request_sheet.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show
        EventAssistanceCheckpointSection,
        EventAssistanceCheckpointPhase,
        assistanceCheckpointRequestCopy;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalCheckpointSheet extends ConsumerWidget {
  const EventRehearsalCheckpointSheet({super.key, required this.selection});
  final RehearsalMovementSelection selection;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventRehearsalMovementProvider(selection);
    final page = ref.watch(query);
    final owner = eventRehearsalMovementControllerProvider(selection.scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final candidate = state is RehearsalMovementForm ? state : null;
    final command = candidate?.change?.command;
    final sameReport =
        command is RehearsalRecordCheckpoint &&
        command.selectedRevision == selection.progressRevision;
    final pendingOther =
        !sameReport &&
        candidate != null &&
        (candidate.phase == RehearsalMovementPhase.submitting ||
            candidate.canRetry);
    final form = sameReport ? candidate : null;
    void run(Future<Object?> Function() action) {
      unawaited(() async {
        try {
          await action();
        } on Object catch (error) {
          if (context.mounted) showCatchNoticeError(context, error);
        }
      }());
    }

    Future<void> manageRequest() async {
      await showCatchBottomSheet<void>(
        context: context,
        builder: (_) =>
            EventRehearsalCheckpointRequestSheet(selection: selection),
      );
      if (context.mounted) {
        controller.reload();
        ref.read(query.notifier).reload();
      }
    }

    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: context.l10n.eventAssistanceCheckpointTitle,
        badge: context.l10n.hostEventRehearsalBadge,
        badgeTone: CatchBadgeTone.danger,
        child: switch (state) {
          RehearsalMovementUnavailable(:final error) =>
            CatchLocalizedErrorBanner(error),
          RehearsalMovementIdle() || RehearsalMovementForm() =>
            pendingOther
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      CatchText(
                        context.l10n.eventAssistanceDepartureOtherPending,
                        variant: CatchTextVariant.supporting,
                      ),
                      if ((command is RehearsalManageCheckpoint ||
                              command is RehearsalResolveCheckpointVisit) &&
                          command?.selectedRevision ==
                              selection.progressRevision)
                        CatchButton(
                          key: const ValueKey('checkpoint.manageRequest'),
                          label: context
                              .l10n
                              .eventAssistanceCheckpointRequestManage,
                          onPressed: candidate.canRetry ? manageRequest : null,
                        )
                      else if (candidate.canRetry)
                        CatchButton(
                          label: context.l10n.eventAssistanceGroupRetry,
                          onPressed: () => run(controller.retry),
                        ),
                    ],
                  )
                : CatchAsyncBoundary<RehearsalMovementPage>(
                    value: form == null ? page : AsyncData(form.review),
                    initialLoadTimeout: null,
                    onRetry: () => ref.read(query.notifier).reload(),
                    loadingBuilder: (_) => const CatchLoadingIndicator(),
                    errorBuilder: (_, error, _, retry) =>
                        CatchLocalizedErrorBanner(error, onRetry: retry),
                    builder: (_, review) {
                      final snapshot = review.snapshot;
                      final checkpoint =
                          form?.result?.movementReview?.checkpoint ??
                          snapshot.checkpoint;
                      if (checkpoint == null) {
                        return CatchText(
                          context.l10n.eventAssistanceCheckpointNoDestination,
                          variant: CatchTextVariant.supporting,
                        );
                      }
                      final role = snapshot.staffReview;
                      final phase = form == null
                          ? EventAssistanceCheckpointPhase.ready
                          : switch (form.phase) {
                              RehearsalMovementPhase.ready =>
                                EventAssistanceCheckpointPhase.ready,
                              RehearsalMovementPhase.submitting =>
                                EventAssistanceCheckpointPhase.submitting,
                              RehearsalMovementPhase.retryRequired =>
                                EventAssistanceCheckpointPhase.retryRequired,
                              RehearsalMovementPhase.refreshRequired =>
                                EventAssistanceCheckpointPhase.refreshRequired,
                              RehearsalMovementPhase.saved =>
                                EventAssistanceCheckpointPhase.saved,
                            };
                      return EventAssistanceCheckpointSection(
                        reviewIdentity: review,
                        availability: checkpoint.availability,
                        names: {
                          for (final m
                              in checkpoint.departure.roster?.members ??
                                  <RehearsalDepartureMember>[])
                            m.attendeeId: m.displayName,
                        },
                        progressRevision: checkpoint.progressRevision,
                        contextMessage:
                            '${snapshot.groups.firstWhere((g) => g.groupId == snapshot.scope.groupId).label}\n${context.l10n.hostEventRehearsalAssistanceAs(name: role?.practiceOperatorId == null ? context.l10n.hostEventRehearsalHostRole : role?.operators[role.practiceOperatorId]?.displayName ?? context.l10n.hostEventRehearsalUnavailableRole)}',
                        canReport: snapshot.canReport,
                        phase:
                            phase == EventAssistanceCheckpointPhase.ready &&
                                !review.isCurrent
                            ? EventAssistanceCheckpointPhase.refreshRequired
                            : phase,
                        submittedObservation: sameReport
                            ? command.observation
                            : null,
                        error: form?.error,
                        requestMessage: assistanceCheckpointRequestCopy(
                          context,
                          checkpoint.request,
                        ),
                        onConfirm: (observation) => run(() {
                          controller.open(review);
                          return controller.submit(
                            RehearsalRecordCheckpoint(
                              snapshot: snapshot,
                              observation: observation,
                            ),
                          );
                        }),
                        onRetry: () => run(controller.retry),
                        onReload: () {
                          if (form != null) {
                            controller.reload();
                          } else {
                            ref.read(query.notifier).reload();
                          }
                        },
                        onManageRequest: manageRequest,
                        onDone: () => Navigator.of(context).pop(),
                      );
                    },
                  ),
        },
      ),
    );
  }
}
