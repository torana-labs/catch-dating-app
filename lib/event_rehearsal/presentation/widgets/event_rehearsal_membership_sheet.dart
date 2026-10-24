import 'dart:async';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_membership.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_membership_receivers.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_membership_controller.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceMembershipSection, EventAssistanceMembershipPhase;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Synthetic adapter for the same group controls, fixed to the original run.
class EventRehearsalMembershipSheet extends ConsumerWidget {
  const EventRehearsalMembershipSheet({
    super.key,
    required this.scope,
    required this.guestName,
    this.practiceOperatorId,
  });
  final RehearsalMembershipScope scope;
  final String guestName;
  final String? practiceOperatorId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventRehearsalAssistanceProvider(
      scope.sessionId,
      practiceOperatorId: practiceOperatorId,
    );
    final page = ref.watch(query);
    final owner = eventRehearsalMembershipControllerProvider(scope);
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
      final RehearsalMembershipForm form => form,
      _ => null,
    };
    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: state is RehearsalMembershipUnavailable
            ? context.l10n.eventAssistanceGroupReview
            : guestName,
        badge: context.l10n.hostEventRehearsalBadge,
        badgeTone: CatchBadgeTone.danger,
        child: switch (state) {
          RehearsalMembershipUnavailable(:final error) =>
            CatchLocalizedErrorBanner(error),
          RehearsalMembershipIdle() || RehearsalMembershipForm() =>
            CatchAsyncBoundary<RehearsalAssistanceReview>(
              value: form == null ? page : AsyncData(form.review),
              initialLoadTimeout: null,
              onRetry: () => ref.read(query.notifier).reload(),
              loadingBuilder: (_) => const CatchLoadingIndicator(),
              errorBuilder: (_, error, _, retry) =>
                  CatchLocalizedErrorBanner(error, onRetry: retry),
              builder: (_, review) {
                final row =
                    form?.membership ??
                    review.snapshot.membershipReviews?.rows
                        .where((r) => r.scope == scope)
                        .firstOrNull;
                if (row == null) {
                  return CatchText(
                    context.l10n.eventAssistanceGroupChanged,
                    variant: CatchTextVariant.supporting,
                  );
                }
                final facts =
                    form?.result?.membershipReviews?.rows
                        .where((r) => r.scope == scope)
                        .firstOrNull
                        ?.facts ??
                    row.facts;
                final phase = form == null
                    ? EventAssistanceMembershipPhase.ready
                    : switch (form.phase) {
                        RehearsalMembershipPhase.ready =>
                          EventAssistanceMembershipPhase.ready,
                        RehearsalMembershipPhase.submitting =>
                          EventAssistanceMembershipPhase.submitting,
                        RehearsalMembershipPhase.retryRequired =>
                          EventAssistanceMembershipPhase.retryRequired,
                        RehearsalMembershipPhase.refreshRequired =>
                          EventAssistanceMembershipPhase.refreshRequired,
                        RehearsalMembershipPhase.saved =>
                          EventAssistanceMembershipPhase.saved,
                      };
                final staff = review.snapshot.staffReview;
                final role = staff?.practiceOperatorId;
                return EventAssistanceMembershipSection(
                  facts: facts,
                  actorUid: row.actorUid,
                  handoverReview: rehearsalMembershipReceivers(
                    review.snapshot.session,
                    row,
                  ),
                  contextMessage: context.l10n.hostEventRehearsalAssistanceAs(
                    name: role == null
                        ? context.l10n.hostEventRehearsalHostRole
                        : staff?.operators[role]?.displayName ??
                              context.l10n.hostEventRehearsalUnavailableRole,
                  ),
                  phase:
                      phase == EventAssistanceMembershipPhase.ready &&
                          !review.isCurrent
                      ? EventAssistanceMembershipPhase.refreshRequired
                      : phase,
                  unavailableMessage:
                      row.availability ==
                          RehearsalMembershipAvailability.notApplicable
                      ? context.l10n.eventAssistanceGroupNotApplicable
                      : null,
                  submittedDecision:
                      (form?.change?.command as RehearsalTransferGroup?)
                          ?.decision,
                  error: form?.error,
                  onDecide: (choice) => run(() {
                    controller.open(review, row);
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
