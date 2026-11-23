part of 'consumer_router.dart';

EventDetailScreen _eventDetailScreen(GoRouterState state) {
  final extra = eventDetailRouteExtra(state);
  return EventDetailScreen(
    organizerId: state.pathParameters['organizerId']!,
    eventId: state.pathParameters['eventId']!,
    inviteCode: state.uri.queryParameters['invite'],
    inviteLinkId:
        state.uri.queryParameters['il'] ??
        state.uri.queryParameters['inviteLinkId'],
    initialEvent: extra.initialEvent,
    presentationMode: extra.presentationMode,
    heroTag: extra.heroTag,
    attribution: extra.attribution,
  );
}

Page<void> _organizerDetailPage(BuildContext _, GoRouterState state) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    name: state.name,
    child: OrganizerDetailScreen(
      organizerId: state.pathParameters['organizerId']!,
      initialOrganizer: routeOrganizerExtra(state),
    ),
    transitionDuration: CatchMotion.calendarScroll,
    reverseTransitionDuration: CatchMotion.base,
    transitionsBuilder: (context, animation, secondaryAnimation, child) =>
        CatchRevealViewport(animation: animation, child: child),
  );
}

Page<void> _exploreMapPage(BuildContext _, GoRouterState state) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    name: state.name,
    child: const ExploreMapScreen(),
    transitionDuration: CatchMotion.slow,
    reverseTransitionDuration: CatchMotion.base,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return CatchRevealViewport.stationary(animation: animation, child: child);
    },
  );
}

Page<void> _eventDetailPage(BuildContext _, GoRouterState state) {
  final child = _eventDetailScreen(state);
  if (eventDetailRouteExtra(state).transition ==
      EventDetailRouteTransition.platform) {
    return MaterialPage<void>(
      key: state.pageKey,
      name: state.name,
      child: child,
    );
  }

  return CustomTransitionPage<void>(
    key: state.pageKey,
    name: state.name,
    child: child,
    transitionDuration: CatchMotion.slow,
    reverseTransitionDuration: CatchMotion.base,
    transitionsBuilder: (context, animation, secondaryAnimation, child) =>
        CatchRevealViewport(animation: animation, child: child),
  );
}
