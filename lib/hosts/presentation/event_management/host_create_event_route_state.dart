import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';

enum HostCreateEventRouteStatus { loading, error, notFound, forbidden, ready }

enum HostCreateEventRouteRetryIntent { reloadClub }

class HostCreateEventRouteState {
  const HostCreateEventRouteState._({
    required this.status,
    required this.club,
    required this.error,
    required this.retryIntent,
    required this.usedInitialClub,
  });

  final HostCreateEventRouteStatus status;
  final Club? club;
  final Object? error;
  final HostCreateEventRouteRetryIntent? retryIntent;
  final bool usedInitialClub;

  bool get isReady => status == HostCreateEventRouteStatus.ready;

  factory HostCreateEventRouteState.initial(Club club) {
    return HostCreateEventRouteState._(
      status: HostCreateEventRouteStatus.ready,
      club: club,
      error: null,
      retryIntent: null,
      usedInitialClub: true,
    );
  }

  factory HostCreateEventRouteState.fromClubState(
    CatchAsyncState<Club?> clubState,
  ) {
    return switch (clubState.status) {
      CatchAsyncStatus.loading => const HostCreateEventRouteState._(
        status: HostCreateEventRouteStatus.loading,
        club: null,
        error: null,
        retryIntent: null,
        usedInitialClub: false,
      ),
      CatchAsyncStatus.error => HostCreateEventRouteState._(
        status: HostCreateEventRouteStatus.error,
        club: null,
        error: clubState.error,
        retryIntent: HostCreateEventRouteRetryIntent.reloadClub,
        usedInitialClub: false,
      ),
      CatchAsyncStatus.data =>
        clubState.value == null
            ? const HostCreateEventRouteState._(
                status: HostCreateEventRouteStatus.notFound,
                club: null,
                error: null,
                retryIntent: null,
                usedInitialClub: false,
              )
            : HostCreateEventRouteState._(
                status: HostCreateEventRouteStatus.ready,
                club: clubState.value,
                error: null,
                retryIntent: null,
                usedInitialClub: false,
              ),
    };
  }

  factory HostCreateEventRouteState.resolve({
    required Club? initialClub,
    required CatchAsyncState<Club?>? fetchedClub,
    required CatchAsyncState<String?> uid,
  }) {
    final clubState = initialClub != null
        ? HostCreateEventRouteState.initial(initialClub)
        : HostCreateEventRouteState.fromClubState(fetchedClub!);
    final club = clubState.club;
    if (clubState.status != HostCreateEventRouteStatus.ready || club == null) {
      return clubState;
    }

    return switch (uid.status) {
      CatchAsyncStatus.loading => HostCreateEventRouteState._(
        status: HostCreateEventRouteStatus.loading,
        club: club,
        error: null,
        retryIntent: null,
        usedInitialClub: clubState.usedInitialClub,
      ),
      CatchAsyncStatus.error => HostCreateEventRouteState._(
        status: HostCreateEventRouteStatus.error,
        club: club,
        error: uid.error,
        retryIntent: null,
        usedInitialClub: clubState.usedInitialClub,
      ),
      CatchAsyncStatus.data =>
        club.isHostedBy(uid.value)
            ? clubState
            : HostCreateEventRouteState._(
                status: HostCreateEventRouteStatus.forbidden,
                club: club,
                error: null,
                retryIntent: null,
                usedInitialClub: clubState.usedInitialClub,
              ),
    };
  }
}
