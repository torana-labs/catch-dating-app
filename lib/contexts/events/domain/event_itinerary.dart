// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_domain_classes.mjs
// Then run: dart run build_runner build
//
// Data shape emitted from contracts/shared/event_common.schema.json (#/definitions/eventItineraryItem).
// Derived behavior, if any, lives in a hand-written companion extension file.
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

// Hand-written derived behavior for this data shape lives in the
// companion file below; it is re-exported so consumers of this file
// keep seeing those getters/helpers/types unchanged.
export 'event_itinerary_extensions.dart';

part 'event_itinerary.freezed.dart';
part 'event_itinerary.g.dart';

enum EventItineraryKind {
  gather,
  activity,
  stop,
  @JsonValue('break')
  breakTime,
  transition,
  finish,
}

@freezed
abstract class EventItineraryItem with _$EventItineraryItem {
  const factory EventItineraryItem({
    required String id,
    required EventItineraryKind kind,
    required int offsetMinutes,
    int? durationMinutes,
    required String title,
    String? description,
    EventMeetingLocation? location,
    int? routeDistanceMeters,
  }) = _EventItineraryItem;

  factory EventItineraryItem.fromJson(Map<String, dynamic> json) =>
      _$EventItineraryItemFromJson(json);
}
