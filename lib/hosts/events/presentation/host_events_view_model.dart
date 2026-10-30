import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_state.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';

HostEventsRouteState buildHostEventsRouteState({
  required CatchAsyncState<String?> uid,
  CatchAsyncState<List<Organizer>>? organizers,
}) {
  if (uid.hasError) {
    return HostEventsRouteState(
      status: HostEventsRouteStatus.error,
      error: uid.error,
      stackTrace: uid.stackTrace,
      errorContext: AppErrorContext.auth,
    );
  }

  final currentUid = uid.value;
  if (currentUid == null) {
    return uid.isLoading
        ? const HostEventsRouteState(status: HostEventsRouteStatus.loading)
        : const HostEventsRouteState(
            status: HostEventsRouteStatus.authRequired,
          );
  }

  final organizerValue = organizers;
  if (organizerValue == null || organizerValue.isLoading) {
    return HostEventsRouteState(
      status: HostEventsRouteStatus.loading,
      uid: currentUid,
    );
  }
  if (organizerValue.hasError) {
    return HostEventsRouteState(
      status: HostEventsRouteStatus.error,
      uid: currentUid,
      error: organizerValue.error,
      stackTrace: organizerValue.stackTrace,
    );
  }

  final resolvedOrganizers = List<Organizer>.unmodifiable(
    organizerValue.value ?? const <Organizer>[],
  );
  return HostEventsRouteState(
    status: resolvedOrganizers.isEmpty
        ? HostEventsRouteStatus.empty
        : HostEventsRouteStatus.loaded,
    uid: currentUid,
    organizers: resolvedOrganizers,
  );
}

HostEventsWorkspaceState buildHostEventsWorkspaceState(
  CatchAsyncState<List<Event>> events, {
  required DateTime now,
  Iterable<PrivateEventSetupInventoryItem> unpublishedUpcoming =
      const <PrivateEventSetupInventoryItem>[],
  Iterable<PrivateEventSetupInventoryItem> unpublishedHistory =
      const <PrivateEventSetupInventoryItem>[],
  Iterable<Event> cancelledEvents = const <Event>[],
  String? featuredEventId,
  bool hasMoreActive = false,
  bool hasMorePast = false,
  bool loadingMoreActive = false,
  bool loadingMorePast = false,
  Object? activeLoadMoreError,
  Object? pastError,
  StackTrace? pastStackTrace,
}) {
  if (events.hasError) {
    return HostEventsWorkspaceState(
      status: HostEventsWorkspaceStatus.error,
      error: events.error,
      stackTrace: events.stackTrace,
    );
  }
  if (events.isLoading) {
    return const HostEventsWorkspaceState(
      status: HostEventsWorkspaceStatus.loading,
    );
  }

  return HostEventsWorkspaceState.fromEvents(
    events: events.value ?? const <Event>[],
    now: now,
    unpublishedUpcoming: unpublishedUpcoming,
    unpublishedHistory: unpublishedHistory,
    cancelledEvents: cancelledEvents,
    featuredEventId: featuredEventId,
    hasMoreActive: hasMoreActive,
    hasMorePast: hasMorePast,
    loadingMoreActive: loadingMoreActive,
    loadingMorePast: loadingMorePast,
    activeLoadMoreError: activeLoadMoreError,
    pastError: pastError,
    pastStackTrace: pastStackTrace,
  );
}
