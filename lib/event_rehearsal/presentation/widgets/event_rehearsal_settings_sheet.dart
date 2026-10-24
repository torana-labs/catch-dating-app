import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_settings_change.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_settings_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_runtime_section.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_late_join_draft.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/event_success/event_success.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The retained owner decides which form is shown while a save is unresolved.
class EventRehearsalSettingsSheet extends ConsumerWidget {
  const EventRehearsalSettingsSheet({
    super.key,
    required this.sessionId,
    this.groupId,
  });
  final String sessionId;
  final String? groupId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventRehearsalAssistanceProvider(sessionId);
    final page = ref.watch(query);
    final pageState = catchAsyncStateFromAsyncValue(page);
    final owner = eventRehearsalSettingsControllerProvider(sessionId);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final form = state is RehearsalSettingsForm ? state : null;
    final target = form == null ? groupId : form.groupId;
    final denied =
        pageState.error is AppException &&
        {
          'permission-denied',
          'unauthenticated',
          'sign-in-required',
          'session-changed',
        }.contains((pageState.error! as AppException).code);
    void run(Future<Object?> Function() action) => unawaited(() async {
      try {
        await action();
      } on Object catch (error) {
        if (context.mounted) showCatchNoticeError(context, error);
      }
    }());
    void reload() {
      if (form?.canReload ?? false) {
        controller.reload();
      } else if (form == null) {
        ref.read(query.notifier).reload();
      }
    }

    void done() {
      controller.close();
      Navigator.of(context).pop();
    }

    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: target == null
            ? context.l10n.eventAssistanceRuntimeTitle
            : context.l10n.eventAssistanceLateJoinTitle,
        badge: context.l10n.hostEventRehearsalBadge,
        badgeTone: CatchBadgeTone.danger,
        child: state is RehearsalSettingsUnavailable
            ? CatchLocalizedErrorBanner(state.error)
            : CatchAsyncBoundary<RehearsalAssistanceReview>(
                value: form == null || denied ? page : AsyncData(form.review),
                initialLoadTimeout: null,
                onRetry: reload,
                loadingBuilder: (_) => const CatchLoadingIndicator(),
                errorBuilder: (_, error, _, retry) =>
                    CatchLocalizedErrorBanner(error, onRetry: retry),
                builder: (_, review) {
                  final fresh = pageState.isSettledData
                      ? pageState.value
                      : null;
                  final base = form?.result ?? review.snapshot;
                  final snapshot =
                      form?.phase == RehearsalSettingsPhase.saved &&
                          fresh != null &&
                          fresh.snapshot.session.runtimeRevision >=
                              base.session.runtimeRevision
                      ? fresh.snapshot
                      : base;
                  final settings = snapshot.settingsReview;
                  if (settings == null ||
                      target != null && !settings.groups.containsKey(target)) {
                    return CatchText(
                      context.l10n.hostEventRehearsalStaffReadOnly,
                      variant: CatchTextVariant.supporting,
                    );
                  }
                  final phase =
                      form?.phase ??
                      (review.isCurrent
                          ? RehearsalSettingsPhase.ready
                          : RehearsalSettingsPhase.refreshRequired);
                  void save(RehearsalSettingsDecision decision) => run(() {
                    controller.open(fresh ?? review, groupId: target);
                    controller.select(decision);
                    return controller.submit();
                  });
                  if (target == null) {
                    return EventRehearsalRuntimeSection(
                      reviewIdentity: form?.review ?? review,
                      snapshot: snapshot,
                      phase: phase,
                      submitted: form?.change?.decision,
                      error: pageState.error ?? form?.error,
                      onConfigure: (value) =>
                          save(RehearsalConfigureUpdates(value)),
                      onPause: () => save(const RehearsalPauseUpdates()),
                      onRetry: () => run(controller.retry),
                      onReload: reload,
                      onDone: done,
                    );
                  }
                  final group = settings.groups[target]!;
                  final rules =
                      group.effective?.rules ?? settings.suggested.rules;
                  final initial = LateJoinSettingDraft.fromPreference(
                    target == 'event:whole' &&
                            group.preference is LateJoinInherit
                        ? LateJoinConfigured(settings.suggested)
                        : group.preference,
                    fallbackRules: rules,
                  );
                  return EventAssistanceLateJoinSection(
                    reviewIdentity: form?.review ?? review,
                    initialDraft: initial,
                    groupId: target,
                    groupLabel: group.label,
                    setup: group.setup,
                    serverTime: settings.serverTime,
                    runtimeTiming: settings.runtimeTiming,
                    status: group.status,
                    origin: group.origin,
                    phase: switch (phase) {
                      RehearsalSettingsPhase.ready =>
                        settings.canConfigure
                            ? EventAssistanceLateJoinPhase.ready
                            : EventAssistanceLateJoinPhase.readOnly,
                      RehearsalSettingsPhase.submitting =>
                        EventAssistanceLateJoinPhase.submitting,
                      RehearsalSettingsPhase.retryRequired =>
                        EventAssistanceLateJoinPhase.retryRequired,
                      RehearsalSettingsPhase.refreshRequired =>
                        EventAssistanceLateJoinPhase.refreshRequired,
                      RehearsalSettingsPhase.saved =>
                        EventAssistanceLateJoinPhase.saved,
                    },
                    suggestedRules: settings.suggested.rules,
                    submittedDraft: switch (form?.change?.decision) {
                      RehearsalSetRule(:final preference) =>
                        LateJoinSettingDraft.fromPreference(
                          preference,
                          fallbackRules: rules,
                        ),
                      _ => null,
                    },
                    error: pageState.error ?? form?.error,
                    onSave: (draft) => run(() {
                      final current = fresh ?? review;
                      controller.open(current, groupId: target);
                      final currentSettings = current.snapshot.settingsReview!;
                      controller.select(
                        RehearsalSetRule(
                          target,
                          draft.preferenceForSetup(
                            groupId: target,
                            serverTime: currentSettings.serverTime,
                            setup: currentSettings.groups[target]?.setup,
                            runtimeTiming: currentSettings.runtimeTiming,
                          ),
                        ),
                      );
                      return controller.submit();
                    }),
                    onRetry: () => run(controller.retry),
                    onReload: reload,
                    onDone: done,
                  );
                },
              ),
      ),
    );
  }
}
