import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:collection/collection.dart';

const swipeWindowDuration = Duration(hours: 24);
const swipeWindowClockTick = Duration(seconds: 30);

DateTime swipeWindowClosesAt(Event event) =>
    event.endTime.add(swipeWindowDuration);

bool hasOpenSwipeWindow(Event event, {required DateTime now}) {
  if (event.endTime.isAfter(now)) return false;
  return !swipeWindowClosesAt(event).isBefore(now);
}

List<Event> eventsWithOpenSwipeWindow(
  Iterable<Event> events, {
  required DateTime now,
}) {
  return events.where((event) => hasOpenSwipeWindow(event, now: now)).toList();
}

Event? latestEventWithOpenSwipeWindow(
  Iterable<Event> events, {
  required DateTime now,
}) {
  return maxBy(
    events.where((event) => hasOpenSwipeWindow(event, now: now)),
    (event) => event.endTime,
  );
}
