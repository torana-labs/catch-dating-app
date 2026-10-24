import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_case.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_case_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_cases_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_decision_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_queue_section.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceHelpSheet extends ConsumerWidget {
  const EventAssistanceHelpSheet({
    super.key,
    required this.scope,
    required this.query,
  });
  final EventAssistanceCaseScope scope;
  final EventAssistanceCaseQuery query;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pageProvider = eventAssistanceCasesProvider(query);
    final page = ref.watch(pageProvider);
    final pageState = catchAsyncStateFromAsyncValue(page);
    final owner = eventAssistanceCaseEditorProvider(scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final form = state is AssistanceCaseForm ? state : null;
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
      if (form != null) controller.reload();
      ref.read(pageProvider.notifier).reload();
    }

    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: context.l10n.eventAssistanceHelpTitle,
        child: state is AssistanceCaseFormUnavailable
            ? CatchLocalizedErrorBanner(state.error)
            : CatchAsyncBoundary<EventAssistanceCasesSession>(
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
                      ? pageState.value?.page.cases
                            .where((r) => r.scope == scope)
                            .firstOrNull
                      : null;
                  final original = form?.result?.view ?? form?.review.request;
                  final row =
                      newer != null &&
                          (original == null ||
                              newer.observedAt >= original.observedAt &&
                                  _revision(newer) >= _revision(original))
                      ? newer
                      : original ??
                            session.page.cases
                                .where((r) => r.scope == scope)
                                .firstOrNull;
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
                          AssistanceCaseEditorPhase.choosing =>
                            EventAssistanceHelpPhase.ready,
                          AssistanceCaseEditorPhase.submitting =>
                            EventAssistanceHelpPhase.submitting,
                          AssistanceCaseEditorPhase.retryRequired =>
                            EventAssistanceHelpPhase.retryRequired,
                          AssistanceCaseEditorPhase.refreshRequired =>
                            EventAssistanceHelpPhase.refreshRequired,
                          AssistanceCaseEditorPhase.saved =>
                            EventAssistanceHelpPhase.saved,
                        };
                  return EventAssistanceHelpDecisionSection(
                    item: liveHelpItem(row),
                    reviewIdentity: session,
                    actorUid: session.account.uid,
                    options: session.page.managerOptions,
                    phase: phase == EventAssistanceHelpPhase.ready
                        ? !session.isCurrent
                              ? EventAssistanceHelpPhase.refreshRequired
                              : row is AssistanceOpenHostCase
                              ? phase
                              : EventAssistanceHelpPhase.readOnly
                        : phase,
                    submittedDecision: form?.decision,
                    error: form?.error,
                    onDecide: row is! AssistanceOpenHostCase
                        ? null
                        : (decision) => run(() {
                            controller.open(session.review(row));
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

int _revision(AssistanceHostCase row) => switch (row) {
  AssistanceOpenHostCase(:final revision) ||
  AssistanceClosedHostCase(:final revision) ||
  AssistanceStaleHostCase(:final revision) => revision,
  AssistanceLegacyHostCase() => -1,
};
