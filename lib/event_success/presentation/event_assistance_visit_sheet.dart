import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_accountability_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_accountability_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_visit_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Live transport adapter for the shared atomic visit controls.
class EventAssistanceVisitSheet extends ConsumerWidget {
  const EventAssistanceVisitSheet({
    super.key,
    required this.scope,
    required this.guestName,
  });
  final EventAssistanceAccountabilityScope scope;
  final String guestName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventAssistanceAccountabilityProvider(scope);
    final page = ref.watch(query);
    final owner = eventAssistanceAccountabilityControllerProvider(scope.guest);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);

    void run(Future<Object?> Function() action) {
      unawaited(() async {
        try {
          await action();
        } on Object catch (error) {
          if (context.mounted) showCatchNoticeError(context, error);
        }
      }());
    }

    final form = switch (state) {
      final AccountabilityForm form => form,
      AccountabilityIdle() || AccountabilityUnavailable() => null,
    };
    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: state is AccountabilityUnavailable
            ? context.l10n.eventAssistanceVisitReview
            : guestName,
        child: switch (state) {
          AccountabilityUnavailable(:final error) => CatchLocalizedErrorBanner(
            error,
          ),
          AccountabilityIdle() || AccountabilityForm() =>
            CatchAsyncBoundary<EventAssistanceAccountabilitySession>(
              value: form == null ? page : AsyncData(form.review),
              initialLoadTimeout: null,
              onRetry: () => ref.read(query.notifier).reload(),
              loadingBuilder: (_) => const CatchLoadingIndicator(),
              errorBuilder: (_, error, _, retry) =>
                  CatchLocalizedErrorBanner(error, onRetry: retry),
              builder: (_, review) {
                final view = form?.result?.view ?? review.view;
                final phase = form == null
                    ? EventAssistanceVisitPhase.ready
                    : switch (form.phase) {
                        AccountabilityPhase.ready =>
                          EventAssistanceVisitPhase.ready,
                        AccountabilityPhase.submitting =>
                          EventAssistanceVisitPhase.submitting,
                        AccountabilityPhase.retryRequired =>
                          EventAssistanceVisitPhase.retryRequired,
                        AccountabilityPhase.refreshRequired =>
                          EventAssistanceVisitPhase.refreshRequired,
                        AccountabilityPhase.saved =>
                          EventAssistanceVisitPhase.saved,
                      };
                final availability = view.availability;
                final ready = phase == EventAssistanceVisitPhase.ready;
                return EventAssistanceVisitSection(
                  disposition: view.disposition,
                  contextMessage: view.scope.checkpoint == null
                      ? null
                      : context.l10n.eventAssistanceVisitCheckpointContext,
                  submittedDisposition: form?.change?.disposition,
                  phase: ready && !review.isCurrent
                      ? EventAssistanceVisitPhase.refreshRequired
                      : ready && !view.canResolve
                      ? EventAssistanceVisitPhase.unavailable
                      : phase,
                  unavailableMessage:
                      availability is AssistanceAccountabilityUnavailable
                      ? assistanceVisitUnavailableCopy(
                          context.l10n,
                          availability.reason,
                        )
                      : null,
                  error: form?.error,
                  onResolve: (choice) => run(() {
                    controller.open(review);
                    controller.select(choice);
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
