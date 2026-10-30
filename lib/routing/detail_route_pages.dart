part of 'go_router.dart';

Event? _eventDetailInitialEvent(GoRouterState state) {
  return switch (state.extra) {
    EventDetailRouteExtra(:final initialEvent) => initialEvent,
    final Event event => event,
    _ => null,
  };
}

EventDetailRouteTransition _eventDetailTransition(GoRouterState state) {
  return switch (state.extra) {
    EventDetailRouteExtra(:final transition) => transition,
    _ => EventDetailRouteTransition.platform,
  };
}

EventDetailPresentationMode _eventDetailPresentationMode(GoRouterState state) {
  return switch (state.extra) {
    EventDetailRouteExtra(:final presentationMode) => presentationMode,
    _ => EventDetailPresentationMode.standard,
  };
}

Object? _eventDetailHeroTag(GoRouterState state) {
  return switch (state.extra) {
    EventDetailRouteExtra(:final heroTag) => heroTag,
    _ => null,
  };
}

EventDetailAttribution? _eventDetailAttribution(GoRouterState state) {
  return switch (state.extra) {
    EventDetailRouteExtra(:final attribution) => attribution,
    _ => null,
  };
}

Organizer? _organizerDetailInitialOrganizer(GoRouterState state) {
  return switch (state.extra) {
    final Organizer organizer => organizer,
    _ => null,
  };
}

Page<void> _organizerDetailPage(BuildContext _, GoRouterState state) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    name: state.name,
    child: OrganizerDetailScreen(
      clubId: state.pathParameters['clubId']!,
      initialOrganizer: _organizerDetailInitialOrganizer(state),
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
  if (_eventDetailTransition(state) == EventDetailRouteTransition.platform) {
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
