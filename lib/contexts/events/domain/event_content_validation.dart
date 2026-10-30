import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/platform/schema_contracts/field_value_validation.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';

bool isValidEventMeetingLocation(EventMeetingLocation location) {
  final value = location.normalized();
  return acceptsContractValue(
        CatchContractConstraints.eventDocumentMeetingLocationName,
        value.name,
      ) &&
      acceptsContractValue(
        CatchContractConstraints.eventDocumentMeetingLocationLatitude,
        value.latitude,
      ) &&
      acceptsContractValue(
        CatchContractConstraints.eventDocumentMeetingLocationLongitude,
        value.longitude,
      ) &&
      acceptsContractValue(
        CatchContractConstraints.eventDocumentMeetingLocationAddress,
        value.address,
        omitted: value.address == null,
      ) &&
      acceptsContractValue(
        CatchContractConstraints.eventDocumentMeetingLocationPlaceId,
        value.placeId,
        omitted: value.placeId == null,
      ) &&
      acceptsContractValue(
        CatchContractConstraints.eventDocumentMeetingLocationNotes,
        value.notes,
        omitted: value.notes == null,
      );
}

bool isValidEventItinerary(List<EventItineraryItem> items) {
  if (!acceptsContractValue(
    CatchContractConstraints.eventDocumentItinerary,
    items,
  )) {
    return false;
  }
  final ids = <String>{};
  var previousOffset = -1;
  for (final item in items) {
    if (!ids.add(item.id) ||
        item.offsetMinutes < previousOffset ||
        item.title.trim().isEmpty ||
        !acceptsContractValue(
          CatchContractConstraints.eventDocumentItineraryItemsId,
          item.id,
        ) ||
        !acceptsContractValue(
          CatchContractConstraints.eventDocumentItineraryItemsTitle,
          item.title,
        ) ||
        !acceptsContractValue(
          CatchContractConstraints.eventDocumentItineraryItemsOffsetMinutes,
          item.offsetMinutes,
        ) ||
        !acceptsContractValue(
          CatchContractConstraints.eventDocumentItineraryItemsDurationMinutes,
          item.durationMinutes,
          omitted: item.durationMinutes == null,
        ) ||
        !acceptsContractValue(
          CatchContractConstraints.eventDocumentItineraryItemsDescription,
          item.description,
          omitted: item.description == null,
        ) ||
        !acceptsContractValue(
          CatchContractConstraints
              .eventDocumentItineraryItemsRouteDistanceMeters,
          item.routeDistanceMeters,
          omitted: item.routeDistanceMeters == null,
        ) ||
        item.location != null && !isValidEventMeetingLocation(item.location!)) {
      return false;
    }
    previousOffset = item.offsetMinutes;
  }
  return true;
}
