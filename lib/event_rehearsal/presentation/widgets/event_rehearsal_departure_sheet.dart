import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_departure_draft.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceDepartureSection, EventAssistanceDeparturePhase;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalDepartureSheet extends ConsumerWidget {
  const EventRehearsalDepartureSheet({super.key, required this.selection});
  final RehearsalMovementSelection selection;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventRehearsalMovementProvider(selection);
    final page = ref.watch(query);
    final owner = eventRehearsalMovementControllerProvider(selection.scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final form = state is RehearsalMovementForm ? state : null;
    void run(Future<Object?> Function() action) {
      unawaited(() async {
        try {
          await action();
        } on Object catch (error) {
          if (context.mounted) showCatchNoticeError(context, error);
        }
      }());
    }

    return PopScope(
      canPop: state.canDismiss,
      child: CatchSheet.standard(
        title: context.l10n.eventAssistanceDepartureTitle,
        badge: context.l10n.hostEventRehearsalBadge,
        badgeTone: CatchBadgeTone.danger,
        child: switch (state) {
          RehearsalMovementUnavailable(:final error) =>
            CatchLocalizedErrorBanner(error),
          RehearsalMovementIdle() ||
          RehearsalMovementForm() => CatchAsyncBoundary<RehearsalMovementPage>(
            value: form == null ? page : AsyncData(form.review),
            initialLoadTimeout: null,
            onRetry: () => ref.read(query.notifier).reload(),
            loadingBuilder: (_) => const CatchLoadingIndicator(),
            errorBuilder: (_, error, _, retry) =>
                CatchLocalizedErrorBanner(error, onRetry: retry),
            builder: (_, review) {
              final snapshot = review.snapshot;
              final result = form?.result?.movementReview;
              final current = result?.current ?? snapshot.current;
              final role = snapshot.staffReview;
              final until = role == null || role.isManager
                  ? snapshot.endAt + 14400000
                  : (role.operatorPermissionUntil(
                              snapshot.actorUid,
                              snapshot.scope.groupId,
                              AssistanceGroupPermission.recordCheckpoint,
                            ) ??
                            snapshot.serverTime) -
                        1;
              final command = form?.change?.command;
              final otherAction =
                  command != null && command is! RehearsalConfirmDeparture;
              final phase = form == null
                  ? EventAssistanceDeparturePhase.ready
                  : switch (form.phase) {
                      RehearsalMovementPhase.ready =>
                        EventAssistanceDeparturePhase.ready,
                      RehearsalMovementPhase.submitting =>
                        EventAssistanceDeparturePhase.submitting,
                      RehearsalMovementPhase.retryRequired =>
                        EventAssistanceDeparturePhase.retryRequired,
                      RehearsalMovementPhase.refreshRequired =>
                        EventAssistanceDeparturePhase.refreshRequired,
                      RehearsalMovementPhase.saved =>
                        EventAssistanceDeparturePhase.saved,
                    };
              if (otherAction) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    CatchText(
                      context.l10n.eventAssistanceDepartureOtherPending,
                      variant: CatchTextVariant.supporting,
                    ),
                    if (form!.canRetry)
                      CatchButton(
                        label: context.l10n.eventAssistanceGroupRetry,
                        onPressed: () => run(controller.retry),
                      ),
                    if (form.canReload)
                      CatchButton(
                        label: context.l10n.eventAssistanceDepartureReload,
                        onPressed: controller.reload,
                      ),
                  ],
                );
              }
              return EventAssistanceDepartureSection(
                reviewIdentity: review,
                destinations: [
                  for (final d in snapshot.destinations)
                    (target: d.target, label: d.label, detail: d.text),
                ],
                currentDestination: current == null
                    ? null
                    : snapshot.destinations
                              .where(
                                (d) =>
                                    d.target == current.departure.destination,
                              )
                              .firstOrNull
                              ?.label ??
                          context.l10n.eventAssistanceDepartureSourceChanged,
                sourceChanged:
                    current != null &&
                    current.departure.sourceHash != snapshot.sourceHash,
                guests: [
                  for (final g in snapshot.candidates)
                    (id: g.attendeeId, name: g.displayName),
                ],
                canConfirm: snapshot.canConfirm,
                actorUid: snapshot.actorUid,
                serverTime: snapshot.serverTime,
                checkpointUntil: min(
                  until,
                  min(
                    snapshot.serverTime + 604800000,
                    snapshot.endAt + 14400000,
                  ),
                ),
                contextMessage:
                    '${snapshot.groups.firstWhere((g) => g.groupId == snapshot.scope.groupId).label}\n${context.l10n.hostEventRehearsalAssistanceAs(name: role?.practiceOperatorId == null ? context.l10n.hostEventRehearsalHostRole : role?.operators[role.practiceOperatorId]?.displayName ?? context.l10n.hostEventRehearsalUnavailableRole)}',
                phase:
                    phase == EventAssistanceDeparturePhase.ready &&
                        !review.isCurrent
                    ? EventAssistanceDeparturePhase.refreshRequired
                    : phase,
                submittedDraft: command is RehearsalConfirmDeparture
                    ? EventAssistanceDepartureDraft(
                        destination: command.destination,
                        roster: command.roster,
                        checkpoint: command.checkpoint,
                      )
                    : null,
                error: form?.error,
                onConfirm: (draft) => run(() {
                  controller.open(review);
                  return controller.submit(
                    RehearsalConfirmDeparture(
                      snapshot: snapshot,
                      destination: draft.destination,
                      roster: draft.roster,
                      checkpoint: draft.checkpoint,
                    ),
                  );
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
