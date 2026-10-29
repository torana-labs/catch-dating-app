import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_draft.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_setting_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_setting_provider.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceLateJoinSheet extends ConsumerWidget {
  const EventAssistanceLateJoinSheet({
    super.key,
    required this.scope,
    required this.groupLabel,
  });
  final EventAssistanceGroupScope scope;
  final String groupLabel;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pageProvider = eventAssistanceLateJoinSettingProvider(scope);
    final page = ref.watch(pageProvider);
    final pageState = catchAsyncStateFromAsyncValue(page);
    final owner = eventAssistanceLateJoinSettingEditorProvider(scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final form = state is LateJoinSettingForm ? state : null;
    final privateReadDenied =
        pageState.error is PermissionException ||
        pageState.error is SignInRequiredException ||
        pageState.error is AppException &&
            {
              'permission-denied',
              'unauthenticated',
              'sign-in-required',
            }.contains((pageState.error! as AppException).code);
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
      if (form?.canReload ?? false) {
        controller.reload();
      } else {
        ref.read(pageProvider.notifier).reload();
      }
    }

    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: context.l10n.eventAssistanceLateJoinTitle,
        child: state is LateJoinSettingFormUnavailable
            ? CatchLocalizedErrorBanner(state.error)
            : CatchAsyncBoundary<LateJoinSettingSession>(
                value: form == null || privateReadDenied
                    ? page
                    : AsyncData(form.review),
                initialLoadTimeout: null,
                onRetry: reload,
                loadingBuilder: (_) => const CatchLoadingIndicator(),
                errorBuilder: (_, error, _, retry) =>
                    CatchLocalizedErrorBanner(error, onRetry: retry),
                builder: (_, session) {
                  final fresh = pageState.isSettledData
                      ? pageState.value
                      : null;
                  final result = form?.result?.view;
                  final base = result ?? session.view;
                  final view =
                      fresh != null &&
                          fresh.view.serverTime >= base.serverTime &&
                          fresh.view.ownRevision >= base.ownRevision
                      ? fresh.view
                      : base;
                  final phase = form == null
                      ? (session.isCurrent
                            ? EventAssistanceLateJoinPhase.ready
                            : EventAssistanceLateJoinPhase.refreshRequired)
                      : switch (form.phase) {
                          LateJoinSettingEditorPhase.choosing =>
                            form.review.isCurrent
                                ? EventAssistanceLateJoinPhase.ready
                                : EventAssistanceLateJoinPhase.refreshRequired,
                          LateJoinSettingEditorPhase.submitting =>
                            EventAssistanceLateJoinPhase.submitting,
                          LateJoinSettingEditorPhase.retryRequired =>
                            EventAssistanceLateJoinPhase.retryRequired,
                          LateJoinSettingEditorPhase.refreshRequired =>
                            EventAssistanceLateJoinPhase.refreshRequired,
                          LateJoinSettingEditorPhase.saved =>
                            EventAssistanceLateJoinPhase.saved,
                        };
                  final initial = LateJoinSettingDraft.fromView(view);
                  return EventAssistanceLateJoinSection(
                    reviewIdentity: fresh ?? session,
                    initialDraft: initial,
                    groupId: scope.groupId,
                    groupLabel: groupLabel,
                    setup: view.setup,
                    serverTime: view.serverTime,
                    status: view.status,
                    origin: view.origin,
                    phase: phase,
                    suggestedRules: view.suggested?.rules,
                    submittedDraft: form?.change == null
                        ? null
                        : LateJoinSettingDraft.fromPreference(
                            form!.change!.preference,
                            fallbackRules: initial.rules,
                          ),
                    error: pageState.error ?? form?.error,
                    onSave: (draft) => run(() {
                      final review = fresh ?? session;
                      controller.open(review);
                      controller.select(draft.preferenceFor(review.view));
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
