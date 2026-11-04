import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';

/// Rows a delivery page holds at most; the listener reads one more to know
/// whether a next page exists.
const eventAssistanceDeliveryPageSize = ReadLimitPolicy.hostLiveReviewPage;

/// One `hostEventDeliveryViews` document as the data layer hands it over: its
/// id and fields, with `evaluatedAt` already converted to milliseconds.
typedef AssistanceDeliveryViewDocument = ({
  String id,
  Map<String, Object?> data,
  int evaluatedAtMillis,
});

final class EventAssistanceDeliveriesPage {
  const EventAssistanceDeliveriesPage._(
    this.query,
    this.serverTime,
    this.deliveries,
    this.nextCursor,
    this.nextActionLapseMillis,
  );
  final EventAssistanceDeliveryQuery query;

  /// When the newest row on the page was evaluated; zero for an empty page.
  final int serverTime;
  final List<AssistanceHostDelivery> deliveries;
  final String? nextCursor;

  /// The earliest instant after [nowMillis] at which a row's manual handoff
  /// lapses; the page must be rebuilt then. Null when none will.
  final int? nextActionLapseMillis;

  /// One listener snapshot of an event's delivery views, read against the app
  /// clock: a row's manual handoff applies only while [nowMillis] is before
  /// the view's `relevantUntilMillis`. A view the server could not evaluate
  /// fails the page rather than hiding a message, as the retired callable did.
  factory EventAssistanceDeliveriesPage.fromViews({
    required EventAssistanceDeliveryQuery query,
    required List<AssistanceDeliveryViewDocument> views,
    required bool hasMore,
    required int nowMillis,
  }) {
    if (views.length > eventAssistanceDeliveryPageSize) {
      throw const FormatException('Invalid delivery page size.');
    }
    var previousId = query.cursor;
    var serverTime = 0;
    int? nextLapse;
    final deliveries = <AssistanceHostDelivery>[];
    for (final view in views) {
      final data = view.data;
      final id = assistanceMessageIdentity(view.id);
      if (data['messageId'] != id ||
          data['organizerId'] != query.organizerId ||
          data['eventId'] != query.eventId) {
        throw const FormatException('Delivery view scope mismatch.');
      }
      final raw = data['view'];
      if (data['sourceCoverage'] != 'complete' || raw == null) {
        throw const FormatException('A message delivery could not be read.');
      }
      if (previousId != null && id.compareTo(previousId) <= 0) {
        throw const FormatException('Invalid delivery page order.');
      }
      final row = Map<Object?, Object?>.of(assistanceObject(raw));
      final until = assistanceNullableInteger(data['relevantUntilMillis']);
      final actions = row['actions'];
      if ((until == null) != (actions is List && actions.isEmpty)) {
        throw const FormatException('Delivery action window is invalid.');
      }
      if (until != null) {
        if (nowMillis >= until) {
          row['actions'] = const <Object?>[];
        } else if (nextLapse == null || until < nextLapse) {
          nextLapse = until;
        }
      }
      deliveries.add(
        AssistanceHostDelivery.fromJson(
          row,
          scope: query.scopeFor(id),
          serverTime: view.evaluatedAtMillis,
        ),
      );
      previousId = id;
      if (view.evaluatedAtMillis > serverTime) {
        serverTime = view.evaluatedAtMillis;
      }
    }
    if (hasMore && deliveries.length != eventAssistanceDeliveryPageSize) {
      throw const FormatException('Invalid delivery continuation.');
    }
    return EventAssistanceDeliveriesPage._(
      query,
      serverTime,
      List.unmodifiable(deliveries),
      hasMore ? deliveries.last.scope.messageId : null,
      nextLapse,
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
