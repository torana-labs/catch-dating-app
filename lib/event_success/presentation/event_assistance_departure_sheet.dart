import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_draft.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceDepartureSheet extends ConsumerWidget {
  const EventAssistanceDepartureSheet({
    super.key,
    required this.scope,
    required this.eventEnd,
    required this.groupLabel,
  });
  final EventAssistanceGroupScope scope;
  final DateTime eventEnd;
  final String groupLabel;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventAssistanceDepartureProvider(scope);
    final page = ref.watch(query);
    final owner = eventAssistanceDepartureEditorProvider(scope);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final form = state is EventDepartureForm ? state : null;
    final attendees = ref.watch(watchEventAttendeesProvider(scope.eventId));
    final attendeesState = catchAsyncStateFromAsyncValue(attendees);
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
        child: switch (state) {
          EventDepartureFormUnavailable(:final error) =>
            CatchLocalizedErrorBanner(error),
          EventDepartureFormIdle() ||
          EventDepartureForm() => CatchAsyncBoundary<EventDepartureSession>(
            value: form == null ? page : AsyncData(form.session),
            initialLoadTimeout: null,
            onRetry: () => ref.read(query.notifier).reload(),
            loadingBuilder: (_) => const CatchLoadingIndicator(),
            errorBuilder: (_, error, _, retry) =>
                CatchLocalizedErrorBanner(error, onRetry: retry),
            builder: (_, review) {
              final view = form?.result?.view ?? review.view;
              final phase = form == null
                  ? EventAssistanceDeparturePhase.ready
                  : switch (form.phase) {
                      EventDepartureFormPhase.choosing =>
                        EventAssistanceDeparturePhase.ready,
                      EventDepartureFormPhase.reviewingRoster =>
                        EventAssistanceDeparturePhase.reviewingRoster,
                      EventDepartureFormPhase.submitting =>
                        EventAssistanceDeparturePhase.submitting,
                      EventDepartureFormPhase.retryRequired =>
                        EventAssistanceDeparturePhase.retryRequired,
                      EventDepartureFormPhase.refreshRequired =>
                        EventAssistanceDeparturePhase.refreshRequired,
                      EventDepartureFormPhase.saved =>
                        EventAssistanceDeparturePhase.saved,
                    };
              return EventAssistanceDepartureSection(
                reviewIdentity: review,
                contextMessage: groupLabel,
                destinations: [
                  for (final d in review.view.destinations)
                    (
                      target: d.target,
                      label: d.label,
                      detail:
                          [
                                if (d.location.name != d.label) d.location.name,
                                d.location.address,
                                d.location.notes,
                              ]
                              .whereType<String>()
                              .where((s) => s.isNotEmpty)
                              .join('\n'),
                    ),
                ],
                currentDestination: view.progress == null
                    ? null
                    : view.destinations
                              .where(
                                (d) => d.target == view.progress!.destination,
                              )
                              .firstOrNull
                              ?.label ??
                          context.l10n.eventAssistanceDepartureSourceChanged,
                sourceChanged:
                    view.freshness == AssistanceProgressFreshness.sourceChanged,
                guests: [
                  for (final a
                      in attendeesState.value ?? const <EventAttendee>[])
                    if (a.isCheckedIn) (id: a.id, name: a.displayName),
                ],
                rosterLoading:
                    (attendeesState.isLoading ||
                    attendeesState.isRefreshing ||
                    attendeesState.retrying),
                rosterError: attendeesState.error,
                canConfirm: review.view.canConfirm,
                actorUid: review.account.uid,
                serverTime: review.view.serverTime,
                checkpointUntil: min(
                  review.view.authority.validUntil - 1,
                  min(
                    review.view.serverTime + 604800000,
                    eventEnd.millisecondsSinceEpoch + 14400000,
                  ),
                ),
                phase:
                    phase == EventAssistanceDeparturePhase.ready &&
                        !review.isCurrent
                    ? EventAssistanceDeparturePhase.refreshRequired
                    : phase,
                submittedDraft: form?.destination == null
                    ? null
                    : EventAssistanceDepartureDraft(
                        destination: form!.destination!,
                        roster: form.selection,
                        checkpoint: form.checkpoint,
                      ),
                error: form?.error,
                onConfirm: (draft) => run(() async {
                  controller.open(review);
                  controller.selectDestination(draft.destination);
                  controller.selectRoster(draft.roster?.attendeeIds);
                  if (draft.roster != null) await controller.reviewRoster();
                  controller.setCheckpoint(draft.checkpoint);
                  return controller.submit();
                }),
                onRetry: () => run(controller.submit),
                onReload: () {
                  if (form != null) {
                    controller.reload();
                  } else {
                    ref.read(query.notifier).reload();
                  }
                  ref.invalidate(watchEventAttendeesProvider(scope.eventId));
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
