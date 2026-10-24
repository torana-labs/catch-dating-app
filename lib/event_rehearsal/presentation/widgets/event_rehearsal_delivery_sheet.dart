import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_delivery_reviews.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_delivery_controller.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceDeliveryDecisionSection, EventAssistanceDeliveryPhase;
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalDeliverySheet extends ConsumerWidget {
  const EventRehearsalDeliverySheet({
    super.key,
    required this.scope,
    this.practiceOperatorId,
  });
  final RehearsalDeliveryScope scope;
  final String? practiceOperatorId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pageProvider = eventRehearsalAssistanceProvider(
      scope.sessionId,
      practiceOperatorId: practiceOperatorId,
    );
    final page = ref.watch(pageProvider);
    final pageState = catchAsyncStateFromAsyncValue(page);
    final owner = eventRehearsalDeliveryControllerProvider(scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final form = state is RehearsalDeliveryForm ? state : null;
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
        badge: context.l10n.hostEventRehearsalBadge,
        badgeTone: CatchBadgeTone.danger,
        child: state is RehearsalDeliveryUnavailable
            ? CatchLocalizedErrorBanner(state.error)
            : CatchAsyncBoundary<RehearsalAssistanceReview>(
                value: form == null || privateReadDenied
                    ? page
                    : AsyncData(form.review),
                initialLoadTimeout: null,
                onRetry: reload,
                loadingBuilder: (_) => const CatchLoadingIndicator(),
                errorBuilder: (_, error, _, retry) =>
                    CatchLocalizedErrorBanner(error, onRetry: retry),
                builder: (_, review) {
                  final snapshot = form?.result ?? review.snapshot;
                  final confirmed = snapshot.deliveryReviews?.deliveries
                      .where((r) => r.scope == scope)
                      .firstOrNull;
                  final newer = pageState.isSettledData
                      ? pageState.value?.snapshot.deliveryReviews?.deliveries
                            .where((r) => r.scope == scope)
                            .firstOrNull
                      : null;
                  final original = confirmed ?? form?.delivery;
                  final row =
                      newer != null &&
                          (original == null ||
                              newer.evidence.observedAt >=
                                      original.evidence.observedAt &&
                                  newer.evidence.revision >=
                                      original.evidence.revision)
                      ? newer
                      : form?.result != null && confirmed == null
                      ? null
                      : original;
                  if (row == null) {
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (form?.result != null)
                          CatchText(
                            context.l10n.eventAssistanceDeliverySaved,
                            variant: CatchTextVariant.supporting,
                          ),
                        CatchText(
                          context.l10n.eventAssistanceDeliveryMissing,
                          variant: CatchTextVariant.supporting,
                        ),
                        CatchButton(
                          label: context.l10n.eventAssistanceDeliveryReload,
                          onPressed: reload,
                        ),
                        CatchButton(
                          label: context.l10n.eventAssistanceDeliveryDone,
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ],
                    );
                  }
                  final phase = form == null
                      ? EventAssistanceDeliveryPhase.ready
                      : switch (form.phase) {
                          RehearsalDeliveryPhase.ready =>
                            EventAssistanceDeliveryPhase.ready,
                          RehearsalDeliveryPhase.submitting =>
                            EventAssistanceDeliveryPhase.submitting,
                          RehearsalDeliveryPhase.retryRequired =>
                            EventAssistanceDeliveryPhase.retryRequired,
                          RehearsalDeliveryPhase.refreshRequired =>
                            EventAssistanceDeliveryPhase.refreshRequired,
                          RehearsalDeliveryPhase.saved =>
                            EventAssistanceDeliveryPhase.saved,
                        };
                  final manager =
                      review.snapshot.staffReview?.isManager != false;
                  return EventAssistanceDeliveryDecisionSection(
                    item: row.evidence,
                    practice: true,
                    actorUid: review.account.uid,
                    phase: phase == EventAssistanceDeliveryPhase.ready
                        ? !review.isCurrent
                              ? EventAssistanceDeliveryPhase.refreshRequired
                              : row is RehearsalActionableDelivery && manager
                              ? phase
                              : EventAssistanceDeliveryPhase.readOnly
                        : phase,
                    contextMessage: manager
                        ? context.l10n.hostEventRehearsalAssistanceAs(
                            name: context.l10n.hostEventRehearsalHostRole,
                          )
                        : context.l10n.eventAssistanceDeliveryPracticeHost,
                    error: form?.error,
                    onTakeOver: row is! RehearsalActionableDelivery || !manager
                        ? null
                        : () => run(() {
                            controller.open(review, row);
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
