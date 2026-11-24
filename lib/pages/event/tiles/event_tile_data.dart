import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_capacity_labels.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/guest_event_card.dart';

enum EventTileStatus {
  open,
  joined,
  saved,
  recommended,
  hosted,
  waitlisted,
  attended,
  past,
  full,
  ineligible,
  cancelled,
}

/// The labels a tile's kicker and supporting line come from, for an event
/// or a guest event card.
abstract interface class EventTileLabels {
  String? get organizerName;
  String get meetingPoint;
  String get title;
  String get activitySummaryLabel;
}

/// A guest's own event, from its event card: the agenda lists of the
/// calendar and saved events.
class GuestEventTileData implements EventTileLabels {
  const GuestEventTileData({
    required this.card,
    required this.status,
    this.organizerName,
  });

  final GuestEventCard card;
  final EventTileStatus status;
  @override
  final String? organizerName;

  @override
  String get meetingPoint => card.locationName;
  @override
  String get title => card.title;
  @override
  String get activitySummaryLabel => card.activitySummaryLabel;
}

class EventTileData implements EventTileLabels {
  const EventTileData({
    required this.event,
    required this.status,
    this.organizerName,
    this.reasonLabel,
    this.positionLabel,
  });

  factory EventTileData.fromEvent({
    required Event event,
    EventTileStatus status = EventTileStatus.open,
    String? organizerName,
    String? reasonLabel,
    String? positionLabel,
  }) {
    return EventTileData(
      event: event,
      status: status,
      organizerName: organizerName,
      reasonLabel: reasonLabel,
      positionLabel: positionLabel,
    );
  }

  final Event event;
  final EventTileStatus status;
  @override
  final String? organizerName;
  final String? reasonLabel;
  final String? positionLabel;

  String get organizerId => event.organizerId;
  String get eventId => event.id;
  @override
  String get title => event.title;
  @override
  String get meetingPoint => event.locationName;
  String get dateLabel => event.shortDateLabel;
  String get longDateLabel => event.longDateLabel;
  String get timeLabel => EventFormatters.time(event.startTime);
  String get timeRangeLabel => event.timeRangeLabel;
  String get compactTimeRangeLabel => event.compactTimeRangeLabel;
  String get distanceLabel => event.distanceLabel;
  String get paceLabel => event.pace.label;
  @override
  String get activitySummaryLabel => event.activitySummaryLabel;
  EventCapacityLabels get capacity => EventCapacityLabels(event);
  String get signupLabel => capacity.signedUpFractionLabel;
  String get spotsLabel => capacity.spotsFractionLabel;
  String get capacityLabel => capacity.goingAvailabilityLabel();
  String get attendeeConfirmedLabel => capacity.attendeeConfirmedLabel;
}
