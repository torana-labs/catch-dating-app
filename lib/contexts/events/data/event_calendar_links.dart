import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:flutter/services.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_calendar_links.g.dart';

const _calendarChannel = MethodChannel('catch/calendar');

typedef NativeCalendarLauncher =
    Future<bool> Function(CalendarEventPayload event);

// keepalive: native calendar launcher is a platform facade shared by event
// action controllers.
@Riverpod(keepAlive: true)
NativeCalendarLauncher nativeCalendarLauncher(Ref ref) {
  return (event) async {
    try {
      final added = await _calendarChannel.invokeMethod<bool>(
        'addToCalendar',
        event.toJson(),
      );
      return added ?? false;
    } on MissingPluginException {
      return false;
    } on PlatformException {
      return false;
    }
  };
}

// keepalive: calendar controller centralizes event calendar side effects across
// event, dashboard, and payment surfaces.
@Riverpod(keepAlive: true)
EventCalendarController eventCalendarController(Ref ref) =>
    EventCalendarController(ref.watch(nativeCalendarLauncherProvider));

class EventCalendarController {
  const EventCalendarController(this._addEvent);

  final NativeCalendarLauncher _addEvent;

  Future<bool> addToCalendar(Event event) {
    return _addEvent(calendarEventPayloadForEvent(event));
  }
}

class CalendarEventPayload {
  const CalendarEventPayload({
    required this.title,
    required this.description,
    required this.location,
    required this.startTime,
    required this.endTime,
  });

  final String title;
  final String description;
  final String location;
  final DateTime startTime;
  final DateTime endTime;

  Map<String, Object?> toJson() {
    return {
      'title': title,
      'description': description,
      'location': location,
      'startTimeMillis': startTime.millisecondsSinceEpoch,
      'endTimeMillis': endTime.millisecondsSinceEpoch,
    };
  }
}

CalendarEventPayload calendarEventPayloadForEvent(Event event) {
  return CalendarEventPayload(
    title: event.title,
    description: _calendarDetails(event),
    location: _calendarLocation(event),
    startTime: event.startTime,
    endTime: event.endTime,
  );
}

String _calendarDetails(Event event) {
  final details = [
    'Catch event',
    event.description.trim(),
    event.activitySummaryLabel,
    if (event.locationNotes?.trim().isNotEmpty == true)
      event.locationNotes!.trim(),
  ]..removeWhere((line) => line.isEmpty);

  return details.join('\n');
}

String _calendarLocation(Event event) {
  final locationDetails = event.locationNotes?.trim();
  if (locationDetails == null || locationDetails.isEmpty) {
    return event.locationName;
  }
  return '${event.locationName}, $locationDetails';
}
