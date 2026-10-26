part of 'host_event_manage_screen.dart';

typedef _HostEventManageRouteData = ({String? uid, Club? club, Event? event});

class HostEventManageRouteScreen extends ConsumerWidget {
  const HostEventManageRouteScreen({
    super.key,
    required this.clubId,
    required this.eventId,
    this.initialEvent,
    this.initialSection = HostEventManageSection.setup,
    this.initialParticipantSearchQuery = '',
    this.referenceNow,
  });

  final String clubId;
  final String eventId;
  final Event? initialEvent;
  final HostEventManageSection initialSection;
  final String initialParticipantSearchQuery;
  final DateTime? referenceNow;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);
    final clubAsync = ref.watch(fetchClubProvider(clubId));
    final eventAsync = ref.watch(watchEventProvider(eventId));
    final routeDataAsync = _hostEventManageRouteData(
      uid: catchAsyncStateFromAsyncValue(uidAsync),
      club: catchAsyncStateFromAsyncValue(clubAsync),
      event: catchAsyncStateFromAsyncValue(eventAsync),
      initialEvent: initialEvent,
    );

    return CatchAsyncBoundary<_HostEventManageRouteData>(
      value: routeDataAsync,
      onRetry: () {
        ref.invalidate(uidProvider);
        ref.invalidate(fetchClubProvider(clubId));
        ref.invalidate(watchEventProvider(eventId));
      },
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostsHostEventManageRouteScreenTitleManageEvent,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: const CatchRouteBody.standardViewport(
          child: CatchStateViewport.loading(accountForBottomOverlay: false),
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostsHostEventManageRouteScreenTitleManageEvent,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.event,
            onRetry: onBoundaryRetry,
          ),
        ),
      ),
      builder: (context, routeData) {
        final uid = routeData.uid;
        final club = routeData.club;
        final event = routeData.event;
        if (club == null || event == null) {
          return CatchRouteScaffold(
            topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
              title:
                  context.l10n.hostsHostEventManageRouteScreenTitleManageEvent,
              navigation: const CatchTopBarNavigation(
                mode: CatchTopBarNavigationMode.back,
              ),
              emphasis: scrolledUnder
                  ? CatchTopBarEmphasis.divided
                  : CatchTopBarEmphasis.plain,
            ),
            body: CatchRouteBody.standardViewport(
              child: CatchErrorState(
                title: context
                    .l10n
                    .hostsHostEventManageRouteScreenTitleEventNotFound,
                message: context
                    .l10n
                    .hostsHostEventManageRouteScreenMessageThisHostedEventIs,
                actions: const [CatchErrorBackButton()],
              ),
            ),
          );
        }

        if (uid == null || !club.isHostedBy(uid)) {
          return CatchRouteScaffold(
            topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
              title:
                  context.l10n.hostsHostEventManageRouteScreenTitleManageEvent,
              navigation: const CatchTopBarNavigation(
                mode: CatchTopBarNavigationMode.back,
              ),
              emphasis: scrolledUnder
                  ? CatchTopBarEmphasis.divided
                  : CatchTopBarEmphasis.plain,
            ),
            body: CatchRouteBody.standardViewport(
              child: CatchErrorState(
                title: context
                    .l10n
                    .hostsHostEventManageRouteScreenTitleActionUnavailable,
                message: context
                    .l10n
                    .hostsHostEventManageRouteScreenMessageYouCanManageOnly,
                icon: CatchIcons.block,
                actions: const [CatchErrorBackButton()],
              ),
            ),
          );
        }

        return HostEventManageScreen(
          club: club,
          event: event,
          onBackToSuccess:
              CatchWorkspaceBackScope.maybeOf(context) ??
              () => Navigator.of(context).maybePop(),
          initialSection: initialSection,
          initialParticipantSearchQuery: initialParticipantSearchQuery,
          referenceNow: referenceNow,
        );
      },
    );
  }
}

AsyncValue<_HostEventManageRouteData> _hostEventManageRouteData({
  required CatchAsyncState<String?> uid,
  required CatchAsyncState<Club?> club,
  required CatchAsyncState<Event?> event,
  required Event? initialEvent,
}) {
  final resolvedEvent = event.value ?? initialEvent;
  final error = uid.error ?? club.error ?? event.error;
  if (error != null) {
    final stackTrace =
        uid.stackTrace ??
        club.stackTrace ??
        event.stackTrace ??
        StackTrace.current;
    return AsyncError<_HostEventManageRouteData>(error, stackTrace);
  }
  final loading =
      uid.isLoading ||
      club.isLoading ||
      (event.isLoading && resolvedEvent == null);
  if (loading) return const AsyncLoading<_HostEventManageRouteData>();

  return AsyncData<_HostEventManageRouteData>((
    uid: uid.value,
    club: club.value,
    event: resolvedEvent,
  ));
}
