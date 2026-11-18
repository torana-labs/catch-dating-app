part of 'host_event_manage_screen.dart';

typedef _HostEventManageRouteData = ({
  String? uid,
  Organizer? organizer,
  Event? event,
});

class HostEventManageRouteScreen extends ConsumerWidget {
  const HostEventManageRouteScreen({
    super.key,
    required this.organizerId,
    required this.eventId,
    this.initialEvent,
    this.initialSection = HostEventManageSection.setup,
    this.initialParticipantSearchQuery = '',
    this.referenceNow,
  });

  final String organizerId;
  final String eventId;
  final Event? initialEvent;
  final HostEventManageSection initialSection;
  final String initialParticipantSearchQuery;
  final DateTime? referenceNow;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // The rebuilt workspace and guest lists read and check access themselves.
    if (hostEventRouteOpensWithoutEvent(initialSection)) {
      final request = HostEventRequest(
        organizerId: organizerId,
        eventId: eventId,
      );
      return initialSection == HostEventManageSection.guests
          ? HostEventGuestsScreen(request: request)
          : HostEventWorkspaceScreen(
              organizerId: organizerId,
              eventId: eventId,
              now: referenceNow,
            );
    }
    final uidAsync = ref.watch(uidProvider);
    final organizerAsync = ref.watch(watchOrganizerProvider(organizerId));
    final eventAsync = ref.watch(watchEventProvider(eventId));
    final routeDataAsync = _hostEventManageRouteData(
      uid: catchAsyncStateFromAsyncValue(uidAsync),
      organizer: catchAsyncStateFromAsyncValue(organizerAsync),
      event: catchAsyncStateFromAsyncValue(eventAsync),
      initialEvent: initialEvent,
    );

    return CatchAsyncBoundary<_HostEventManageRouteData>(
      value: routeDataAsync,
      onRetry: () {
        ref.invalidate(uidProvider);
        ref.invalidate(watchOrganizerProvider(organizerId));
        ref.invalidate(watchEventProvider(eventId));
      },
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchLegacyTopBar.route(
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
        topBarBuilder: (context, scrolledUnder) => CatchLegacyTopBar.route(
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
        final organizer = routeData.organizer;
        final event = routeData.event;
        if (organizer == null || event == null) {
          return CatchRouteScaffold(
            topBarBuilder: (context, scrolledUnder) => CatchLegacyTopBar.route(
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

        if (uid == null || !organizer.isHostedBy(uid)) {
          return CatchRouteScaffold(
            topBarBuilder: (context, scrolledUnder) => CatchLegacyTopBar.route(
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

        final now = referenceNow ?? DateTime.now();
        final onBack =
            CatchWorkspaceBackScope.maybeOf(context) ??
            () => Navigator.of(context).maybePop();
        final plan = ref.watch(watchEventSuccessPlanProvider(event.id)).value;
        final destination = hostEventRouteDestination(
          section: initialSection,
          phase: hostEventWorkspacePhaseFor(event: event, now: now),
          liveConsoleFits: hostLiveConsoleFits(event, plan: plan),
          movingNight: hostMovingNightView(event, plan: plan),
        );
        return switch (destination) {
          HostEventRouteDestination.report => HostEventReportScreen(
            organizer: organizer,
            event: event,
            onBack: CatchWorkspaceBackScope.maybeOf(context),
            now: referenceNow,
          ),
          HostEventRouteDestination.liveConsole => HostLiveScreen(
            organizer: organizer,
            event: event,
            onBack: onBack,
            onOpenGuests: () => context.pushNamed(
              Routes.hostEventRosterScreen.name,
              pathParameters: {
                'organizerId': organizer.id,
                'eventId': event.id,
              },
              extra: event,
            ),
            now: referenceNow,
          ),
          HostEventRouteDestination.runConsole => HostFormatsRunScreen(
            organizer: organizer,
            event: event,
            onBack: onBack,
            now: referenceNow,
          ),
          HostEventRouteDestination.crawlBoard => HostFormatsCrawlScreen(
            organizer: organizer,
            event: event,
            onBack: onBack,
            now: referenceNow,
          ),
          // Setup and guests return above; a night with a saved room layout
          // keeps the old console and its room map.
          HostEventRouteDestination.workspace ||
          HostEventRouteDestination.guests ||
          HostEventRouteDestination.movementConsole => HostEventManageScreen(
            organizer: organizer,
            event: event,
            onBackToSuccess: onBack,
            initialSection: initialSection,
            initialParticipantSearchQuery: initialParticipantSearchQuery,
            referenceNow: referenceNow,
          ),
        };
      },
    );
  }
}

AsyncValue<_HostEventManageRouteData> _hostEventManageRouteData({
  required CatchAsyncState<String?> uid,
  required CatchAsyncState<Organizer?> organizer,
  required CatchAsyncState<Event?> event,
  required Event? initialEvent,
}) {
  final resolvedEvent = event.value ?? initialEvent;
  final error = uid.error ?? organizer.error ?? event.error;
  if (error != null) {
    final stackTrace =
        uid.stackTrace ??
        organizer.stackTrace ??
        event.stackTrace ??
        StackTrace.current;
    return AsyncError<_HostEventManageRouteData>(error, stackTrace);
  }
  final loading =
      uid.isLoading ||
      organizer.isLoading ||
      (event.isLoading && resolvedEvent == null);
  if (loading) return const AsyncLoading<_HostEventManageRouteData>();

  return AsyncData<_HostEventManageRouteData>((
    uid: uid.value,
    organizer: organizer.value,
    event: resolvedEvent,
  ));
}
