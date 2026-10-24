import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_deliveries_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_decision_section.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceDeliverySheet extends ConsumerWidget {
  const EventAssistanceDeliverySheet({
    super.key,
    required this.scope,
    required this.query,
  });
  final EventAssistanceDeliveryScope scope;
  final EventAssistanceDeliveryQuery query;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pageProvider = eventAssistanceDeliveriesProvider(query);
    final page = ref.watch(pageProvider);
    final pageState = catchAsyncStateFromAsyncValue(page);
    final owner = eventAssistanceDeliveryControllerProvider(scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final form = state is AssistanceDeliveryForm ? state : null;
    final privateReadDenied =
        pageState.error is PermissionException ||
        pageState.error is SignInRequiredException;
    void run(Future<Object?> Function() action) {
      unawaited(() async {
        try {
          await action();
        } on Object catch (error) {
          if (context.mounted) showCatchNoticeError(context, error);
        }
      }());
    }

    void reload() {
      if (form?.canReload ?? false) controller.reload();
      ref.read(pageProvider.notifier).reload();
    }

    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: context.l10n.eventAssistanceDeliveryTitle,
        child: state is AssistanceDeliveryUnavailable
            ? CatchLocalizedErrorBanner(state.error)
            : CatchAsyncBoundary<EventAssistanceDeliveriesSession>(
                value: form == null || privateReadDenied
                    ? page
                    : AsyncData(form.review.session),
                initialLoadTimeout: null,
                onRetry: reload,
                loadingBuilder: (_) => const CatchLoadingIndicator(),
                errorBuilder: (_, error, _, retry) =>
                    CatchLocalizedErrorBanner(error, onRetry: retry),
                builder: (_, session) {
                  final newer = pageState.isSettledData
                      ? pageState.value?.page.deliveries
                            .where((r) => r.scope == scope)
                            .firstOrNull
                      : null;
                  final original = form?.result?.view ?? form?.review.delivery;
                  final row =
                      newer != null &&
                          (original == null ||
                              newer.observedAt >= original.observedAt &&
                                  newer.revision >= original.revision)
                      ? newer
                      : original ??
                            session.page.deliveries
                                .where((r) => r.scope == scope)
                                .firstOrNull;
                  if (row == null) {
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CatchText(
                          context.l10n.eventAssistanceDeliveryMissing,
                          variant: CatchTextVariant.supporting,
                        ),
                        CatchButton(
                          label: context.l10n.eventAssistanceDeliveryReload,
                          onPressed: reload,
                        ),
                      ],
                    );
                  }
                  final phase = form == null
                      ? EventAssistanceDeliveryPhase.ready
                      : switch (form.phase) {
                          AssistanceDeliveryPhase.ready =>
                            EventAssistanceDeliveryPhase.ready,
                          AssistanceDeliveryPhase.submitting =>
                            EventAssistanceDeliveryPhase.submitting,
                          AssistanceDeliveryPhase.retryRequired =>
                            EventAssistanceDeliveryPhase.retryRequired,
                          AssistanceDeliveryPhase.refreshRequired =>
                            EventAssistanceDeliveryPhase.refreshRequired,
                          AssistanceDeliveryPhase.saved =>
                            EventAssistanceDeliveryPhase.saved,
                        };
                  return EventAssistanceDeliveryDecisionSection(
                    item: row.evidence,
                    actorUid: session.account.uid,
                    phase: phase == EventAssistanceDeliveryPhase.ready
                        ? !session.isCurrent
                              ? EventAssistanceDeliveryPhase.refreshRequired
                              : row is AssistanceActionableDelivery
                              ? phase
                              : EventAssistanceDeliveryPhase.readOnly
                        : phase,
                    error: form?.error,
                    onTakeOver: row is! AssistanceActionableDelivery
                        ? null
                        : () => run(() {
                            controller.open(session.review(row));
                            return controller.takeOver();
                          }),
                    onRetry: () => run(controller.retry),
                    onReload: reload,
                    onDone: () => Navigator.of(context).pop(),
                  );
                },
              ),
      ),
    );
  }
}
