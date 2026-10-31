import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';

final widgetbookCatalogEventStart = DateTime(2026, 6, 14, 6, 30);

Event widgetbookCatalogEvent({
  String id = 'widgetbook-event-detail',
  String title = 'Sundowner 5K, Bandra seafront',
  ActivityKind activityKind = ActivityKind.socialRun,
  EventPolicyBundle? eventPolicy,
  List<UploadedPhoto> eventPhotos = const <UploadedPhoto>[],
  bool exactLocation = true,
  int capacityLimit = 12,
  int bookedCount = 9,
  int priceInPaise = 0,
  EventLifecycleStatus status = EventLifecycleStatus.active,
  DateTime? startTime,
}) {
  final start = startTime ?? widgetbookCatalogEventStart;
  const meetingPoint = 'Carter Road Jetty';
  final location = exactLocation
      ? eventMeetingLocationFromLegacy(
          name: meetingPoint,
          latitude: 19.0676,
          longitude: 72.8227,
          notes: 'Bandra West',
        )
      : null;
  return Event(
    id: id,
    organizerId: 'club-widgetbook',
    startTime: start,
    endTime: start.add(const Duration(hours: 1, minutes: 45)),
    meetingPoint: meetingPoint,
    meetingLocation: location,
    photoUrl: null,
    eventPhotos: eventPhotos,
    eventFormat: EventFormatSnapshot.fromActivityKind(activityKind),
    distanceKm: activityKind == ActivityKind.socialRun ? 5 : 0,
    pace: PaceLevel.easy,
    capacityLimit: capacityLimit,
    description:
        'An easy social pace along the seafront as the light goes gold, with coffee after for anyone who lingers.',
    priceInPaise: priceInPaise,
    bookedCount: bookedCount,
    waitlistedCount: 3,
    status: status,
    eventPolicy:
        eventPolicy ??
        EventPolicyBundle.openEvent(
          capacityLimit: capacityLimit,
          basePriceInPaise: priceInPaise,
        ),
  );
}
