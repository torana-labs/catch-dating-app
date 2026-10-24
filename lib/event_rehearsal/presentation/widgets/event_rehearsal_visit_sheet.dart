import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_accountability.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_accountability_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceVisitSection, EventAssistanceVisitPhase;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Practice transport adapter; the run/guest pending owner cannot follow a reset.
class EventRehearsalVisitSheet extends ConsumerWidget {
  const EventRehearsalVisitSheet({
    super.key,
    required this.scope,
    required this.guestName,
    this.practiceOperatorId,
  });
  final RehearsalAccountabilityScope scope;
  final String guestName;
  final String? practiceOperatorId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventRehearsalAssistanceProvider(
      scope.sessionId,
      practiceOperatorId: practiceOperatorId,
    );
    final page = ref.watch(query);
    final owner = eventRehearsalAccountabilityControllerProvider(scope);
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
      final RehearsalAccountabilityForm form => form,
      RehearsalAccountabilityIdle() ||
      RehearsalAccountabilityUnavailable() => null,
    };
    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: state is RehearsalAccountabilityUnavailable
            ? context.l10n.eventAssistanceVisitReview
            : guestName,
        badge: context.l10n.hostEventRehearsalBadge,
        badgeTone: CatchBadgeTone.danger,
        child: switch (state) {
          RehearsalAccountabilityUnavailable(:final error) =>
            CatchLocalizedErrorBanner(error),
          RehearsalAccountabilityIdle() || RehearsalAccountabilityForm() =>
            CatchAsyncBoundary<RehearsalAssistanceReview>(
              value: form == null ? page : AsyncData(form.review),
              initialLoadTimeout: null,
              onRetry: () => ref.read(query.notifier).reload(),
              loadingBuilder: (_) => const CatchLoadingIndicator(),
              errorBuilder: (_, error, _, retry) =>
                  CatchLocalizedErrorBanner(error, onRetry: retry),
              builder: (_, review) {
                final row =
                    form?.visit ??
                    review.snapshot.accountabilityReviews?.rows
                        .where((row) => row.scope == scope)
                        .firstOrNull;
                if (row == null) {
                  return CatchText(
                    context.l10n.eventAssistanceVisitChanged,
                    variant: CatchTextVariant.supporting,
                  );
                }
                final evidence =
                    form?.result?.accountabilityReviews?.rows
                        .where((value) => value.scope == scope)
                        .firstOrNull
                        ?.evidence ??
                    row.evidence;
                final phase = form == null
                    ? EventAssistanceVisitPhase.ready
                    : switch (form.phase) {
                        RehearsalAccountabilityPhase.ready =>
                          EventAssistanceVisitPhase.ready,
                        RehearsalAccountabilityPhase.submitting =>
                          EventAssistanceVisitPhase.submitting,
                        RehearsalAccountabilityPhase.retryRequired =>
                          EventAssistanceVisitPhase.retryRequired,
                        RehearsalAccountabilityPhase.refreshRequired =>
                          EventAssistanceVisitPhase.refreshRequired,
                        RehearsalAccountabilityPhase.saved =>
                          EventAssistanceVisitPhase.saved,
                      };
                final ready = phase == EventAssistanceVisitPhase.ready;
                final reason = switch (evidence.availability) {
                  RehearsalVisitReady() =>
                    context.l10n.eventAssistanceVisitReadOnly,
                  RehearsalVisitUnavailable(:final reason) => switch (reason) {
                    RehearsalVisitUnavailableReason.notApplicable =>
                      context.l10n.eventAssistanceVisitNotApplicable,
                    RehearsalVisitUnavailableReason.notCheckedIn =>
                      context.l10n.eventAssistanceVisitNotCheckedIn,
                    RehearsalVisitUnavailableReason.visitNotRecorded =>
                      context.l10n.eventAssistanceVisitNoVisit,
                    RehearsalVisitUnavailableReason.invalidSource =>
                      context.l10n.eventAssistanceVisitChanged,
                  },
                };
                final staff = review.snapshot.staffReview;
                final operatorId = staff?.practiceOperatorId;
                return EventAssistanceVisitSection(
                  contextMessage: context.l10n.hostEventRehearsalAssistanceAs(
                    name: operatorId == null
                        ? context.l10n.hostEventRehearsalHostRole
                        : staff?.operators[operatorId]?.displayName ??
                              context.l10n.hostEventRehearsalUnavailableRole,
                  ),
                  disposition: evidence.disposition,
                  submittedDisposition:
                      (form?.change?.command as RehearsalResolveAccountability?)
                          ?.disposition,
                  phase: ready && !review.isCurrent
                      ? EventAssistanceVisitPhase.refreshRequired
                      : ready && row is! RehearsalActionableAccountability
                      ? EventAssistanceVisitPhase.unavailable
                      : phase,
                  unavailableMessage: reason,
                  error: form?.error,
                  onResolve: row is RehearsalActionableAccountability
                      ? (choice) => run(() {
                          controller.open(review, row);
                          return controller.resolve(choice);
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
