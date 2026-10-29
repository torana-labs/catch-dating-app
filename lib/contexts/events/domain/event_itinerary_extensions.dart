import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';

extension EventItineraryItemX on EventItineraryItem {
  DateTime startsAt(DateTime eventStart) =>
      eventStart.add(Duration(minutes: offsetMinutes));
}
