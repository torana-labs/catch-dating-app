import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_visit_sheet.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show
        EventAssistanceCheckpointRequestSection,
        EventAssistanceCheckpointPhase;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalCheckpointRequestSheet extends ConsumerWidget {
  const EventRehearsalCheckpointRequestSheet({
    super.key,
    required this.selection,
  });
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
        command is RehearsalManageCheckpoint &&
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

    Future<void> reviewGuest(String id, String name) async {
      await showCatchBottomSheet<void>(
        context: context,
        builder: (_) => EventRehearsalCheckpointVisitSheet(
          selection: selection,
          attendeeId: id,
          guestName: name,
        ),
      );
      if (context.mounted) {
        controller.reload();
        ref.read(query.notifier).reload();
      }
    }

    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: context.l10n.eventAssistanceCheckpointRequestTitle,
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
                      if (command is RehearsalResolveCheckpointVisit &&
                          command.selectedRevision ==
                              selection.progressRevision)
                        CatchButton(
                          key: const ValueKey('checkpoint.visit.pending'),
                          label:
                              context.l10n.eventAssistanceCheckpointVisitReview,
                          onPressed: candidate.canRetry
                              ? () => reviewGuest(
                                  command.visit.attendeeId,
                                  command
                                      .snapshot
                                      .checkpoint!
                                      .departure
                                      .roster!
                                      .members
                                      .singleWhere(
                                        (m) =>
                                            m.attendeeId ==
                                            command.visit.attendeeId,
                                      )
                                      .displayName,
                                )
                              : null,
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
                      final permissions = RehearsalCheckpointRequestPermissions(
                        snapshot,
                      );
                      final available = checkpoint.availability;
                      return EventAssistanceCheckpointRequestSection(
                        reviewIdentity: review,
                        request: checkpoint.request,
                        eligibility: checkpoint.closeout.value?.eligibility,
                        canClose: permissions.canClose,
                        canReopen: permissions.canReopen,
                        canReassign: permissions.canReassign,
                        reporterOptions:
                            snapshot.checkpoint?.reporterOptions.value,
                        checkpointLabel: available is AssistanceCheckpointRoster
                            ? available.label
                            : null,
                        observationSummary:
                            available is AssistanceCheckpointRoster
                            ? context.l10n.eventAssistanceHistoryObserved(
                                count: available.members
                                    .where((m) => m.accountedFor)
                                    .length,
                                total: available.members.length,
                              )
                            : null,
                        contextMessage:
                            '${snapshot.groups.firstWhere((g) => g.groupId == snapshot.scope.groupId).label}\n${context.l10n.hostEventRehearsalAssistanceAs(name: role?.practiceOperatorId == null ? context.l10n.hostEventRehearsalHostRole : role?.operators[role.practiceOperatorId]?.displayName ?? context.l10n.hostEventRehearsalUnavailableRole)}',
                        members: available is AssistanceCheckpointRoster
                            ? available.members
                            : const [],
                        guestNames: {
                          for (final m
                              in checkpoint.departure.roster?.members ??
                                  <RehearsalDepartureMember>[])
                            m.attendeeId: m.displayName,
                        },
                        reviewableGuestIds: {
                          for (final r
                              in checkpoint.accountabilityReviews.value ??
                                  <RehearsalCheckpointVisitReview>[])
                            if (r.canResolve) r.attendeeId,
                        },
                        onReviewGuest: (id) => reviewGuest(
                          id,
                          checkpoint.departure.roster!.members
                              .singleWhere((m) => m.attendeeId == id)
                              .displayName,
                        ),
                        phase:
                            phase == EventAssistanceCheckpointPhase.ready &&
                                !review.isCurrent
                            ? EventAssistanceCheckpointPhase.refreshRequired
                            : phase,
                        submittedDecision: sameReport ? command.decision : null,
                        error: form?.error,
                        onConfirm: (decision) => run(() {
                          controller.open(review);
                          return controller.submit(
                            RehearsalManageCheckpoint(
                              snapshot: snapshot,
                              decision: decision,
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
                        onDone: () => Navigator.of(context).pop(),
                      );
                    },
                  ),
        },
      ),
    );
  }
}
