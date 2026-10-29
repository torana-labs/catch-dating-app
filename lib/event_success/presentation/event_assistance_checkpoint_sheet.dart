import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceCheckpointSheet extends ConsumerWidget {
  const EventAssistanceCheckpointSheet({
    super.key,
    required this.scope,
    required this.groupLabel,
  });
  final EventAssistanceCheckpointScope scope;
  final String groupLabel;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventAssistanceCheckpointProvider(scope);
    final page = ref.watch(query);
    final owner = eventAssistanceCheckpointControllerProvider(scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final form = state is CheckpointForm ? state : null;
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
        title: context.l10n.eventAssistanceCheckpointTitle,
        child: switch (state) {
          CheckpointUnavailable(:final error) => CatchLocalizedErrorBanner(
            error,
          ),
          CheckpointIdle() || CheckpointForm() =>
            CatchAsyncBoundary<EventAssistanceCheckpointSession>(
              value: form == null ? page : AsyncData(form.review),
              initialLoadTimeout: null,
              onRetry: () => ref.read(query.notifier).reload(),
              loadingBuilder: (_) => const CatchLoadingIndicator(),
              errorBuilder: (_, error, _, retry) =>
                  CatchLocalizedErrorBanner(error, onRetry: retry),
              builder: (_, review) {
                final view = form?.result?.view ?? review.view;
                final available = view.availability;
                final phase = form == null
                    ? EventAssistanceCheckpointPhase.ready
                    : switch (form.phase) {
                        CheckpointPhase.ready =>
                          EventAssistanceCheckpointPhase.ready,
                        CheckpointPhase.submitting =>
                          EventAssistanceCheckpointPhase.submitting,
                        CheckpointPhase.retryRequired =>
                          EventAssistanceCheckpointPhase.retryRequired,
                        CheckpointPhase.refreshRequired =>
                          EventAssistanceCheckpointPhase.refreshRequired,
                        CheckpointPhase.saved =>
                          EventAssistanceCheckpointPhase.saved,
                      };
                return EventAssistanceCheckpointSection(
                  reviewIdentity: review,
                  availability: available,
                  names: {
                    if (available is AssistanceCheckpointRoster)
                      for (final m in available.members)
                        if (m.displayName != null) m.attendeeId: m.displayName!,
                  },
                  progressRevision: view.scope.progressRevision,
                  contextMessage: groupLabel,
                  canReport: review.view.canReport,
                  phase:
                      phase == EventAssistanceCheckpointPhase.ready &&
                          !review.isCurrent
                      ? EventAssistanceCheckpointPhase.refreshRequired
                      : phase,
                  submittedObservation: form?.change?.decision,
                  error: form?.error,
                  requestMessage: assistanceCheckpointRequestCopy(
                    context,
                    view.request,
                  ),
                  onConfirm: (observation) => run(() {
                    controller.open(review);
                    controller.select(observation);
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
                  onManageRequest: () async {
                    await showCatchBottomSheet<void>(
                      context: context,
                      builder: (_) => EventAssistanceCheckpointRequestSheet(
                        scope: scope,
                        groupLabel: groupLabel,
                      ),
                    );
                    if (context.mounted) {
                      controller.reload();
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
