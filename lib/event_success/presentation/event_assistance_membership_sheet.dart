import 'dart:async';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Live transport adapter; the original per-guest owner survives a sheet refresh.
class EventAssistanceMembershipSheet extends ConsumerWidget {
  const EventAssistanceMembershipSheet({
    super.key,
    required this.scope,
    required this.guestName,
  });
  final EventAssistanceGuestScope scope;
  final String guestName;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventAssistanceMembershipProvider(scope);
    final page = ref.watch(query);
    final owner = eventAssistanceMembershipControllerProvider(scope);
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
      final MembershipForm form => form,
      _ => null,
    };
    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: state is MembershipUnavailable
            ? context.l10n.eventAssistanceGroupReview
            : guestName,
        child: switch (state) {
          MembershipUnavailable(:final error) => CatchLocalizedErrorBanner(
            error,
          ),
          MembershipIdle() || MembershipForm() =>
            CatchAsyncBoundary<EventAssistanceMembershipSession>(
              value: form == null ? page : AsyncData(form.review),
              initialLoadTimeout: null,
              onRetry: () => ref.read(query.notifier).reload(),
              loadingBuilder: (_) => const CatchLoadingIndicator(),
              errorBuilder: (_, error, _, retry) =>
                  CatchLocalizedErrorBanner(error, onRetry: retry),
              builder: (_, review) {
                final view = form?.result?.view ?? review.view;
                final phase = form == null
                    ? EventAssistanceMembershipPhase.ready
                    : switch (form.phase) {
                        MembershipPhase.ready =>
                          EventAssistanceMembershipPhase.ready,
                        MembershipPhase.submitting =>
                          EventAssistanceMembershipPhase.submitting,
                        MembershipPhase.retryRequired =>
                          EventAssistanceMembershipPhase.retryRequired,
                        MembershipPhase.refreshRequired =>
                          EventAssistanceMembershipPhase.refreshRequired,
                        MembershipPhase.saved =>
                          EventAssistanceMembershipPhase.saved,
                      };
                return EventAssistanceMembershipSection(
                  facts: view.facts,
                  actorUid: review.account.uid,
                  handoverReview: review.view.handoverReview,
                  phase:
                      phase == EventAssistanceMembershipPhase.ready &&
                          !review.isCurrent
                      ? EventAssistanceMembershipPhase.refreshRequired
                      : phase,
                  submittedDecision: form?.change?.decision,
                  error: form?.error,
                  onDecide: (choice) => run(() {
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
