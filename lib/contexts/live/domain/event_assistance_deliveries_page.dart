import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

final class EventAssistanceDeliveriesPage {
  const EventAssistanceDeliveriesPage._(
    this.query,
    this.serverTime,
    this.deliveries,
    this.nextCursor,
  );
  final EventAssistanceDeliveryQuery query;
  final int serverTime;
  final List<AssistanceHostDelivery> deliveries;
  final String? nextCursor;

  factory EventAssistanceDeliveriesPage.fromCallableData(
    Object? value, {
    required EventAssistanceDeliveryQuery expectedQuery,
  }) {
    final map = assistanceObject(value, {
      'context',
      'serverTime',
      'coverage',
      'deliveries',
      'nextCursor',
    });
    validateAssistanceDeliveryContext(
      map['context'],
      organizerId: expectedQuery.organizerId,
      eventId: expectedQuery.eventId,
    );
    if (map['coverage'] != 'page') {
      throw const FormatException('Unexpected delivery coverage.');
    }
    final serverTime = assistanceInteger(map['serverTime']);
    final rows = map['deliveries'];
    if (rows is! List || rows.length > 50) {
      throw const FormatException('Invalid delivery page size.');
    }
    var previousId = expectedQuery.cursor;
    final deliveries = <AssistanceHostDelivery>[];
    for (final raw in rows) {
      final map = assistanceObject(raw);
      final id = assistanceMessageIdentity(map['messageId']);
      if (previousId != null && id.compareTo(previousId) <= 0) {
        throw const FormatException('Invalid delivery page order.');
      }
      deliveries.add(
        AssistanceHostDelivery.fromJson(
          map,
          scope: expectedQuery.scopeFor(id),
          serverTime: serverTime,
        ),
      );
      previousId = id;
    }
    final cursor = map['nextCursor'] == null
        ? null
        : assistanceMessageIdentity(map['nextCursor']);
    if (cursor != null &&
        (deliveries.length != 50 ||
            cursor != deliveries.last.scope.messageId)) {
      throw const FormatException('Invalid delivery continuation.');
    }
    return EventAssistanceDeliveriesPage._(
      expectedQuery,
      serverTime,
      List.unmodifiable(deliveries),
      cursor,
    );
  }
  EventAssistanceDeliveryQuery? get nextQuery => nextCursor == null
      ? null
      : EventAssistanceDeliveryQuery(
          organizerId: query.organizerId,
          eventId: query.eventId,
          cursor: nextCursor,
        );
}
