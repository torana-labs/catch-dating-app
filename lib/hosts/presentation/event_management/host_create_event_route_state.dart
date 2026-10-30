import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';

enum HostCreateEventRouteStatus { loading, error, notFound, forbidden, ready }

enum HostCreateEventRouteRetryIntent { reloadOrganizer }

class HostCreateEventRouteState {
  const HostCreateEventRouteState._({
    required this.status,
    required this.organizer,
    required this.error,
    required this.retryIntent,
    required this.usedInitialOrganizer,
  });

  final HostCreateEventRouteStatus status;
  final Organizer? organizer;
  final Object? error;
  final HostCreateEventRouteRetryIntent? retryIntent;
  final bool usedInitialOrganizer;

  bool get isReady => status == HostCreateEventRouteStatus.ready;

  factory HostCreateEventRouteState.initial(Organizer organizer) {
    return HostCreateEventRouteState._(
      status: HostCreateEventRouteStatus.ready,
      organizer: organizer,
      error: null,
      retryIntent: null,
      usedInitialOrganizer: true,
    );
  }

  factory HostCreateEventRouteState.fromOrganizerState(
    CatchAsyncState<Organizer?> organizerState,
  ) {
    return switch (organizerState.status) {
      CatchAsyncStatus.loading => const HostCreateEventRouteState._(
        status: HostCreateEventRouteStatus.loading,
        organizer: null,
        error: null,
        retryIntent: null,
        usedInitialOrganizer: false,
      ),
      CatchAsyncStatus.error => HostCreateEventRouteState._(
        status: HostCreateEventRouteStatus.error,
        organizer: null,
        error: organizerState.error,
        retryIntent: HostCreateEventRouteRetryIntent.reloadOrganizer,
        usedInitialOrganizer: false,
      ),
      CatchAsyncStatus.data =>
        organizerState.value == null
            ? const HostCreateEventRouteState._(
                status: HostCreateEventRouteStatus.notFound,
                organizer: null,
                error: null,
                retryIntent: null,
                usedInitialOrganizer: false,
              )
            : HostCreateEventRouteState._(
                status: HostCreateEventRouteStatus.ready,
                organizer: organizerState.value,
                error: null,
                retryIntent: null,
                usedInitialOrganizer: false,
              ),
    };
  }

  factory HostCreateEventRouteState.resolve({
    required Organizer? initialOrganizer,
    required CatchAsyncState<Organizer?>? fetchedOrganizer,
    required CatchAsyncState<String?> uid,
  }) {
    final organizerState = initialOrganizer != null
        ? HostCreateEventRouteState.initial(initialOrganizer)
        : HostCreateEventRouteState.fromOrganizerState(fetchedOrganizer!);
    final organizer = organizerState.organizer;
    if (organizerState.status != HostCreateEventRouteStatus.ready ||
        organizer == null) {
      return organizerState;
    }

    return switch (uid.status) {
      CatchAsyncStatus.loading => HostCreateEventRouteState._(
        status: HostCreateEventRouteStatus.loading,
        organizer: organizer,
        error: null,
        retryIntent: null,
        usedInitialOrganizer: organizerState.usedInitialOrganizer,
      ),
      CatchAsyncStatus.error => HostCreateEventRouteState._(
        status: HostCreateEventRouteStatus.error,
        organizer: organizer,
        error: uid.error,
        retryIntent: null,
        usedInitialOrganizer: organizerState.usedInitialOrganizer,
      ),
      CatchAsyncStatus.data =>
        organizer.isHostedBy(uid.value)
            ? organizerState
            : HostCreateEventRouteState._(
                status: HostCreateEventRouteStatus.forbidden,
                organizer: organizer,
                error: null,
                retryIntent: null,
                usedInitialOrganizer: organizerState.usedInitialOrganizer,
              ),
    };
  }
}
