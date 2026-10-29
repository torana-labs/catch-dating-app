import 'package:catch_dating_app/contexts/events/domain/event.dart';

enum EventDetailRouteTransition {
  platform,
  mapSelectedCard,
  ticketCard,
  spotlightCard,
}

enum EventDetailPresentationMode { standard, ticket, spotlightDark }

enum EventDetailAttributionSource { crossPaths }

class EventDetailAttribution {
  const EventDetailAttribution({
    required this.source,
    required this.suggestionToken,
    required this.rankingVersion,
    required this.reasonCodes,
  });

  final EventDetailAttributionSource source;

  /// Opaque server-signed context retained in memory for the next authorized
  /// Cross Paths action. It must never be emitted to analytics or logs.
  final String suggestionToken;
  final int rankingVersion;
  final List<String> reasonCodes;
}

class EventDetailRouteExtra {
  const EventDetailRouteExtra({
    this.initialEvent,
    this.transition = EventDetailRouteTransition.platform,
    this.presentationMode = EventDetailPresentationMode.standard,
    this.heroTag,
    this.attribution,
  });

  final Event? initialEvent;
  final EventDetailRouteTransition transition;
  final EventDetailPresentationMode presentationMode;
  final Object? heroTag;
  final EventDetailAttribution? attribution;
}

String eventPhotoHeroTag(String eventId) => 'event-photo-$eventId';

String eventTicketHeroTag(String eventId, String source) =>
    'event-ticket-${_heroSource(source)}-$eventId';

String eventSpotlightHeroTag(String eventId, String source) =>
    'event-spotlight-${_heroSource(source)}-$eventId';

String _heroSource(String source) {
  return source.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
}
