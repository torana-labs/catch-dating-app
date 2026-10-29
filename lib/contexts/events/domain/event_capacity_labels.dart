import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';

class EventCapacityLabels {
  const EventCapacityLabels(this.event);

  final Event event;

  int get signedUpCount => event.signedUpCount;
  int get capacityLimit => event.capacityLimit;
  int get spotsRemaining => event.spotsRemaining;

  double get progress {
    if (capacityLimit <= 0) return 0;
    return (signedUpCount / capacityLimit).clamp(0.0, 1.0);
  }

  String get goingLabel => '$signedUpCount going';
  String get signedUpFractionLabel => '$signedUpCount/$capacityLimit signed up';
  String get spotsFractionLabel => '$signedUpCount/$capacityLimit spots';
  String get attendeeConfirmedLabel =>
      '$signedUpCount attendee${signedUpCount == 1 ? '' : 's'} confirmed';

  String goingAvailabilityLabel({String? availabilityLabel}) {
    final availability = availabilityLabel?.trim();
    if (spotsRemaining <= 0) return '$goingLabel · full';
    if (availability != null &&
        availability.isNotEmpty &&
        availability.toLowerCase() != 'open') {
      return '$goingLabel · $availability';
    }
    return '$goingLabel · $spotsRemaining left';
  }

  String activityGoingAvailabilityLabel({String? availabilityLabel}) {
    return '${event.activitySummaryLabel} · '
        '${goingAvailabilityLabel(availabilityLabel: availabilityLabel)}';
  }

  String get joinCtaAvailabilityLabel => '$spotsRemaining spots left';
}
