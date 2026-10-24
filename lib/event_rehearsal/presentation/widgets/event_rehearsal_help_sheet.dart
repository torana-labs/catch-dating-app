import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_help_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_help_queue_sheet.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceHelpDecisionSection, EventAssistanceHelpPhase;
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalHelpSheet extends ConsumerWidget {
  const EventRehearsalHelpSheet({
    super.key,
    required this.scope,
    this.practiceOperatorId,
  });
  final RehearsalHelpScope scope;
  final String? practiceOperatorId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pageProvider = eventRehearsalAssistanceProvider(
      scope.sessionId,
      practiceOperatorId: practiceOperatorId,
    );
    final page = ref.watch(pageProvider);
    final owner = eventRehearsalHelpControllerProvider(scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final form = state is RehearsalHelpForm ? state : null;
    final privateReadDenied =
        page.error is PermissionException ||
        page.error is SignInRequiredException;
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
      if (form != null) controller.reload();
      ref.read(pageProvider.notifier).reload();
    }

    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: context.l10n.eventAssistanceHelpTitle,
        badge: context.l10n.hostEventRehearsalBadge,
        badgeTone: CatchBadgeTone.danger,
        child: state is RehearsalHelpFormUnavailable
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
                  final row =
                      snapshot.helpRequests?.cases
                          .where(
                            (r) => rehearsalHelpScope(snapshot, r) == scope,
                          )
                          .firstOrNull ??
                      form?.request;
                  if (row == null) {
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CatchText(
                          context.l10n.eventAssistanceHelpMissing,
                          variant: CatchTextVariant.supporting,
                        ),
                        CatchButton(
                          label: context.l10n.eventAssistanceHelpReload,
                          onPressed: reload,
                        ),
                      ],
                    );
                  }
                  final phase = form == null
                      ? EventAssistanceHelpPhase.ready
                      : switch (form.phase) {
                          RehearsalHelpEditorPhase.choosing =>
                            EventAssistanceHelpPhase.ready,
                          RehearsalHelpEditorPhase.submitting =>
                            EventAssistanceHelpPhase.submitting,
                          RehearsalHelpEditorPhase.retryRequired =>
                            EventAssistanceHelpPhase.retryRequired,
                          RehearsalHelpEditorPhase.refreshRequired =>
                            EventAssistanceHelpPhase.refreshRequired,
                          RehearsalHelpEditorPhase.saved =>
                            EventAssistanceHelpPhase.saved,
                        };
                  final manager =
                      review.snapshot.staffReview?.isManager != false;
                  return EventAssistanceHelpDecisionSection(
                    item: practiceHelpItem(row),
                    reviewIdentity: review,
                    actorUid: review.account.uid,
                    options: review.snapshot.helpRequests?.managerOptions,
                    phase: phase == EventAssistanceHelpPhase.ready
                        ? !review.isCurrent
                              ? EventAssistanceHelpPhase.refreshRequired
                              : row is RehearsalOpenHelpCase && manager
                              ? phase
                              : EventAssistanceHelpPhase.readOnly
                        : phase,
                    contextMessage: manager
                        ? context.l10n.hostEventRehearsalAssistanceAs(
                            name: context.l10n.hostEventRehearsalHostRole,
                          )
                        : context.l10n.eventAssistanceHelpPracticeHost,
                    submittedDecision: form?.decision,
                    error: form?.error,
                    onDecide: row is! RehearsalOpenHelpCase || !manager
                        ? null
                        : (decision) => run(() {
                            controller.open(review, row);
                            controller.select(decision);
                            return controller.submit();
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
