import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';

// The create flow's pure draft values: how a saved event refills the draft,
// the details patch the draft becomes, and the date, time, price and plan
// conversions between them.

/// The draft refilled from a saved event's basics, keeping what the saved
/// event does not say.
EventDraft createDraftFromSaved(
  EventDraft draft,
  PrivateEventBasicSummary event,
) {
  final details = event.eventDetails;
  final terms = details.admissionTerms;
  final place = details.meetingLocation;
  final start = createMinutesOf(event.localStartTime);
  final end = details.endTimeMillis;
  return draft.copyWith(
    name: event.name,
    eventLocalDate: event.localDate,
    eventLocalStartTime: event.localStartTime,
    description: details.description ?? draft.description,
    activityKind: details.eventFormat?.activityKind.name ?? draft.activityKind,
    interactionModel:
        details.eventFormat?.interactionModel.name ?? draft.interactionModel,
    itinerary: details.itinerary.isEmpty ? draft.itinerary : details.itinerary,
    capacity: terms?.capacityLimit.toString() ?? draft.capacity,
    price: terms == null ? draft.price : (terms.priceInPaise ~/ 100).toString(),
    meetingPoint: place?.name ?? draft.meetingPoint,
    meetingLocationAddress: place?.address ?? draft.meetingLocationAddress,
    meetingLocationPlaceId: place?.placeId ?? draft.meetingLocationPlaceId,
    startingPointLat: place?.latitude ?? draft.startingPointLat,
    startingPointLng: place?.longitude ?? draft.startingPointLng,
    locationDetails: place?.notes ?? draft.locationDetails,
    distance: details.distanceKm?.toString() ?? draft.distance,
    paceName: details.pace ?? draft.paceName,
    durationMinutes: end != null && start != null
        ? ((end - event.startTimeMillis) ~/ 60000)
        : draft.durationMinutes,
  );
}

/// The details patch the draft's basics become; [includeWhere] adds the
/// duration and meeting place.
PrivateEventDetailsPatch createBasicsPatch(
  EventDraft draft,
  CreateFormat? format, {
  bool includeWhere = false,
}) {
  final description = (draft.description ?? '').trim();
  final distance = double.tryParse(draft.distance ?? '');
  final lat = draft.startingPointLat;
  final lng = draft.startingPointLng;
  return PrivateEventDetailsPatch(
    eventFormat: format == null
        ? null
        : EventSetupValue.set(
            EventFormatSnapshot.fromActivityKind(format.activityKind),
          ),
    description: description.isEmpty ? null : description,
    distanceKm: format == CreateFormat.run ? distance : null,
    pace: format == CreateFormat.run ? draft.paceName : null,
    durationMinutes: includeWhere
        ? EventSetupValue.set(draft.durationMinutes)
        : null,
    meetingLocation:
        includeWhere && draft.meetingPoint != null && lat != null && lng != null
        ? EventMeetingLocation(
            name: draft.meetingPoint!,
            address: draft.meetingLocationAddress,
            placeId: draft.meetingLocationPlaceId,
            latitude: lat,
            longitude: lng,
            notes: (draft.locationDetails ?? '').trim().isEmpty
                ? null
                : draft.locationDetails!.trim(),
          )
        : null,
  );
}

String createLocalDate(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-'
    '${date.month.toString().padLeft(2, '0')}-'
    '${date.day.toString().padLeft(2, '0')}';

String createLocalTime(int hour, int minute) =>
    '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';

int? createMinutesOf(String? localTime) {
  final parts = localTime?.split(':');
  if (parts == null || parts.length != 2) return null;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null) return null;
  return hour * 60 + minute;
}

/// Whole rupees entered by the host, in paise; null when not a price.
int? createPricePaise(String? rupees) {
  final value = int.tryParse((rupees ?? '').trim());
  if (value == null || value < 0) return null;
  return value * 100;
}

/// Plan steps start where the one before ends.
List<EventItineraryItem> createSequenced(List<EventItineraryItem> steps) {
  var offset = 0;
  return [
    for (final step in steps)
      () {
        final placed = step.copyWith(offsetMinutes: offset);
        offset += step.durationMinutes ?? 0;
        return placed;
      }(),
  ];
}
