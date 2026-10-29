import 'dart:math';

import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_host_guests_provider.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_departure_controller.g.dart';

typedef EventDepartureMutationKey = ({
  EventDepartureAccount account,
  EventAssistanceGroupScope scope,
});

final class EventDeparturePendingAction {
  const EventDeparturePendingAction._(this.session, this.change);
  final EventDepartureSession session;
  final EventAssistanceDepartureChange change;

  EventDepartureMutationKey get mutationKey =>
      (account: session.account, scope: session.view.scope);
}

@riverpod
class EventAssistanceDepartureController
    extends _$EventAssistanceDepartureController {
  static final confirmMutation = Mutation<EventAssistanceGroupProgressResult>();

  @override
  void build() {
    // Retain the account provider while a standalone mutation owns this controller.
    ref.listen(eventAssistanceDepartureAccountProvider, (_, _) {});
  }

  Future<EventAssistanceDepartureRosterReview> reviewRoster(
    EventDepartureSession session,
    EventAssistanceDepartureRosterSelection selection,
  ) async {
    requireDepartureAccount(ref, session.account);
    final result = await ref
        .read(eventAssistanceDepartureRepositoryProvider)
        .reviewRoster(session.view, selection);
    requireDepartureAccount(ref, session.account);
    if (!identical(result.snapshot, session.view)) {
      throw const FormatException(
        'Departure roster review belongs to another snapshot.',
      );
    }
    return result;
  }

  EventDeparturePendingAction prepare({
    required EventDepartureSession session,
    required AssistanceJoiningTarget destination,
    EventAssistanceDepartureRosterReview? roster,
    AssistanceDepartureCheckpointRequest? checkpoint,
  }) {
    requireDepartureAccount(ref, session.account);
    final random = Random.secure();
    final id = List.generate(
      16,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
    return EventDeparturePendingAction._(
      session,
      EventAssistanceDepartureChange.prepare(
        snapshot: session.view,
        operationId: 'departure:$id',
        destination: destination,
        roster: roster,
        checkpoint: checkpoint,
      ),
    );
  }

  Future<EventAssistanceGroupProgressResult> confirm(
    EventDeparturePendingAction action,
  ) async {
    requireDepartureAccount(ref, action.session.account);
    final result = await ref
        .read(eventAssistanceDepartureRepositoryProvider)
        .confirm(action.change);
    requireDepartureAccount(ref, action.session.account);
    action.change.requireResult(result);
    ref.invalidate(
      eventAssistanceDepartureForAccountProvider(
        action.session.view.scope,
        account: action.session.account,
      ),
    );
    ref.invalidate(eventAssistanceHostGuestsForAccountProvider);
    return result;
  }
}
