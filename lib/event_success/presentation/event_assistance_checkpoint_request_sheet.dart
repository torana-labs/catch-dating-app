import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_visit_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceCheckpointRequestSheet extends ConsumerWidget {
  const EventAssistanceCheckpointRequestSheet({
    super.key,
    required this.scope,
    required this.groupLabel,
  });
  final EventAssistanceCheckpointScope scope;
  final String groupLabel;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventAssistanceCheckpointRequestProvider(scope);
    final page = ref.watch(query);
    final owner = eventAssistanceCheckpointRequestControllerProvider(scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final form = state is CheckpointRequestForm ? state : null;
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
        title: context.l10n.eventAssistanceCheckpointRequestTitle,
        child: switch (state) {
          CheckpointRequestUnavailable(:final error) =>
            CatchLocalizedErrorBanner(error),
          CheckpointRequestIdle() || CheckpointRequestForm() =>
            CatchAsyncBoundary<EventAssistanceCheckpointRequestSession>(
              value: form == null ? page : AsyncData(form.review),
              initialLoadTimeout: null,
              onRetry: () => ref.read(query.notifier).reload(),
              loadingBuilder: (_) => const CatchLoadingIndicator(),
              errorBuilder: (_, error, _, retry) =>
                  CatchLocalizedErrorBanner(error, onRetry: retry),
              builder: (_, review) {
                final view = form?.result?.view ?? review.view.checkpoint;
                final available = view.availability;
                final phase = form == null
                    ? EventAssistanceCheckpointPhase.ready
                    : switch (form.phase) {
                        CheckpointRequestPhase.ready =>
                          EventAssistanceCheckpointPhase.ready,
                        CheckpointRequestPhase.submitting =>
                          EventAssistanceCheckpointPhase.submitting,
                        CheckpointRequestPhase.retryRequired =>
                          EventAssistanceCheckpointPhase.retryRequired,
                        CheckpointRequestPhase.refreshRequired =>
                          EventAssistanceCheckpointPhase.refreshRequired,
                        CheckpointRequestPhase.saved =>
                          EventAssistanceCheckpointPhase.saved,
                      };
                return EventAssistanceCheckpointRequestSection(
                  reviewIdentity: review,
                  contextMessage:
                      '$groupLabel · ${context.l10n.eventAssistanceCheckpointDeparture(number: scope.progressRevision)}',
                  request: view.request,
                  eligibility: view.closeout.value?.eligibility,
                  canClose: review.view.canClose,
                  canReopen: review.view.canReopen,
                  canReassign: review.view.canReassign,
                  reporterOptions: review.view.checkpoint.reporterOptions.value,
                  checkpointLabel: available is AssistanceCheckpointRoster
                      ? available.label
                      : null,
                  observationSummary: available is AssistanceCheckpointRoster
                      ? context.l10n.eventAssistanceHistoryObserved(
                          count: available.members
                              .where((m) => m.accountedFor)
                              .length,
                          total: available.members.length,
                        )
                      : null,
                  members: available is AssistanceCheckpointRoster
                      ? available.members
                      : const [],
                  guestNames: available is AssistanceCheckpointRoster
                      ? {
                          for (final m in available.members)
                            m.attendeeId: ?m.displayName,
                        }
                      : const {},
                  reviewableGuestIds: available is AssistanceCheckpointRoster
                      ? {for (final m in available.members) m.attendeeId}
                      : const {},
                  onReviewGuest: (id) async {
                    final member = (available as AssistanceCheckpointRoster)
                        .members
                        .singleWhere((m) => m.attendeeId == id);
                    await showCatchBottomSheet<void>(
                      context: context,
                      builder: (_) => EventAssistanceVisitSheet(
                        scope: EventAssistanceAccountabilityScope(
                          group: scope.group,
                          attendeeId: id,
                          checkpoint: scope.checkpoint,
                        ),
                        guestName:
                            member.displayName ??
                            context.l10n.eventAssistanceCheckpointUnknownGuest,
                      ),
                    );
                    if (context.mounted) {
                      controller.reload();
                      ref.read(query.notifier).reload();
                    }
                  },
                  phase:
                      phase == EventAssistanceCheckpointPhase.ready &&
                          !review.isCurrent
                      ? EventAssistanceCheckpointPhase.refreshRequired
                      : phase,
                  submittedDecision: form?.change?.decision,
                  error: form?.error,
                  onConfirm: (decision) => run(() {
                    controller.open(review);
                    controller.select(decision);
                    return controller.submit();
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
