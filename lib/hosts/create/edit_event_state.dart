import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:flutter/foundation.dart';

/// Where opening the editor for a saved event stands.
enum EditEventRouteStatus { loading, error, notFound, unauthorized, ready }

/// The signed-in host, the organizer and the event, resolved into what the
/// edit route shows. A passed-in event stands in while the event loads.
@immutable
class EditEventRouteState {
  const EditEventRouteState({
    required this.status,
    this.organizer,
    this.event,
    this.error,
  });

  factory EditEventRouteState.resolve({
    required CatchAsyncState<String?> uid,
    required CatchAsyncState<Organizer?> organizer,
    required CatchAsyncState<Event?> event,
    Event? initialEvent,
  }) {
    final resolvedEvent = event.value ?? initialEvent;
    if (uid.status == CatchAsyncStatus.loading ||
        organizer.status == CatchAsyncStatus.loading ||
        (event.status == CatchAsyncStatus.loading && resolvedEvent == null)) {
      return const EditEventRouteState(status: EditEventRouteStatus.loading);
    }
    final error = uid.error ?? organizer.error ?? event.error;
    if (error != null) {
      return EditEventRouteState(
        status: EditEventRouteStatus.error,
        error: error,
      );
    }
    final resolvedOrganizer = organizer.value;
    if (resolvedOrganizer == null || resolvedEvent == null) {
      return EditEventRouteState(
        status: EditEventRouteStatus.notFound,
        organizer: resolvedOrganizer,
        event: resolvedEvent,
      );
    }
    if (!resolvedOrganizer.isHostedBy(uid.value)) {
      return EditEventRouteState(
        status: EditEventRouteStatus.unauthorized,
        organizer: resolvedOrganizer,
        event: resolvedEvent,
      );
    }
    return EditEventRouteState(
      status: EditEventRouteStatus.ready,
      organizer: resolvedOrganizer,
      event: resolvedEvent,
    );
  }

  final EditEventRouteStatus status;
  final Organizer? organizer;
  final Event? event;
  final Object? error;
}
