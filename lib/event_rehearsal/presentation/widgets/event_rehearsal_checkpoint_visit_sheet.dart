import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show
        EventAssistanceVisitSection,
        EventAssistanceVisitPhase,
        assistanceVisitUnavailableCopy;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Reuses the live atomic visit UI with original-departure practice evidence.
class EventRehearsalCheckpointVisitSheet extends ConsumerWidget {
  const EventRehearsalCheckpointVisitSheet({
    super.key,
    required this.selection,
    required this.attendeeId,
    required this.guestName,
  });
  final RehearsalMovementSelection selection;
  final String attendeeId, guestName;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventRehearsalMovementProvider(selection);
    final page = ref.watch(query);
    final owner = eventRehearsalMovementControllerProvider(selection.scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final candidate = state is RehearsalMovementForm ? state : null;
    final command = candidate?.change?.command;
    final sameVisit =
        command is RehearsalResolveCheckpointVisit &&
        command.selectedRevision == selection.progressRevision &&
        command.visit.attendeeId == attendeeId;
    final pendingOther =
        !sameVisit &&
        candidate != null &&
        (candidate.phase == RehearsalMovementPhase.submitting ||
            candidate.canRetry);
    final form = sameVisit ? candidate : null;
    void run(Future<Object?> Function() action) {
      unawaited(() async {
        try {
          await action();
        } on Object catch (error) {
          if (context.mounted) showCatchNoticeError(context, error);
        }
      }());
    }

    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: state is RehearsalMovementUnavailable
            ? context.l10n.eventAssistanceVisitReview
            : guestName,
        badge: context.l10n.hostEventRehearsalBadge,
        badgeTone: CatchBadgeTone.danger,
        child: switch (state) {
          RehearsalMovementUnavailable(:final error) =>
            CatchLocalizedErrorBanner(error),
          RehearsalMovementIdle() || RehearsalMovementForm() =>
            pendingOther
                ? CatchText(
                    context.l10n.eventAssistanceDepartureOtherPending,
                    variant: CatchTextVariant.supporting,
                  )
                : CatchAsyncBoundary<RehearsalMovementPage>(
                    value: form == null ? page : AsyncData(form.review),
                    initialLoadTimeout: null,
                    onRetry: () => ref.read(query.notifier).reload(),
                    loadingBuilder: (_) => const CatchLoadingIndicator(),
                    errorBuilder: (_, error, _, retry) =>
                        CatchLocalizedErrorBanner(error, onRetry: retry),
                    builder: (_, review) {
                      final snapshot =
                          form?.result?.movementReview ?? review.snapshot;
                      final row = snapshot
                          .checkpoint
                          ?.accountabilityReviews
                          .value
                          ?.where((r) => r.attendeeId == attendeeId)
                          .firstOrNull;
                      if (row == null) {
                        return CatchText(
                          context.l10n.eventAssistanceCheckpointVisitUnknown,
                          variant: CatchTextVariant.supporting,
                        );
                      }
                      final phase = form == null
                          ? EventAssistanceVisitPhase.ready
                          : switch (form.phase) {
                              RehearsalMovementPhase.ready =>
                                EventAssistanceVisitPhase.ready,
                              RehearsalMovementPhase.submitting =>
                                EventAssistanceVisitPhase.submitting,
                              RehearsalMovementPhase.retryRequired =>
                                EventAssistanceVisitPhase.retryRequired,
                              RehearsalMovementPhase.refreshRequired =>
                                EventAssistanceVisitPhase.refreshRequired,
                              RehearsalMovementPhase.saved =>
                                EventAssistanceVisitPhase.saved,
                            };
                      final ready = phase == EventAssistanceVisitPhase.ready;
                      final staff = snapshot.staffReview;
                      final operatorId = staff?.practiceOperatorId;
                      final group = snapshot.groups.firstWhere(
                        (g) => g.groupId == selection.scope.groupId,
                      );
                      return EventAssistanceVisitSection(
                        contextMessage:
                            '${group.label} · ${context.l10n.eventAssistanceCheckpointDeparture(number: selection.progressRevision!)}\n'
                            '${context.l10n.eventAssistanceVisitCheckpointContext}\n'
                            '${context.l10n.hostEventRehearsalAssistanceAs(name: operatorId == null ? context.l10n.hostEventRehearsalHostRole : staff?.operators[operatorId]?.displayName ?? context.l10n.hostEventRehearsalUnavailableRole)}',
                        disposition: row.disposition,
                        submittedDisposition: sameVisit
                            ? command.disposition
                            : null,
                        phase: ready && !review.isCurrent
                            ? EventAssistanceVisitPhase.refreshRequired
                            : ready && !row.canResolve
                            ? EventAssistanceVisitPhase.unavailable
                            : phase,
                        unavailableMessage:
                            row.availability
                                is AssistanceAccountabilityUnavailable
                            ? assistanceVisitUnavailableCopy(
                                context.l10n,
                                (row.availability
                                        as AssistanceAccountabilityUnavailable)
                                    .reason,
                              )
                            : null,
                        error: form?.error,
                        onResolve: row.canResolve
                            ? (choice) => run(() {
                                controller.open(review);
                                return controller.submit(
                                  RehearsalResolveCheckpointVisit(
                                    snapshot: review.snapshot,
                                    visit: row,
                                    disposition: choice,
                                  ),
                                );
                              })
                            : null,
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
