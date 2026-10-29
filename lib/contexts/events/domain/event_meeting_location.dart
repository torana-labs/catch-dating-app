// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_domain_classes.mjs
// Then run: dart run build_runner build
//
// Data shape emitted from contracts/shared/event_common.schema.json (#/definitions/eventMeetingLocation).
// Derived behavior, if any, lives in a hand-written companion extension file.
import 'package:freezed_annotation/freezed_annotation.dart';

// Hand-written derived behavior for this data shape lives in the
// companion file below; it is re-exported so consumers of this file
// keep seeing those getters/helpers/types unchanged.
export 'event_meeting_location_extensions.dart';

part 'event_meeting_location.freezed.dart';
part 'event_meeting_location.g.dart';

@freezed
abstract class EventMeetingLocation with _$EventMeetingLocation {
  const factory EventMeetingLocation({
    required String name,
    String? address,
    String? placeId,
    required double latitude,
    required double longitude,
    String? notes,
  }) = _EventMeetingLocation;

  factory EventMeetingLocation.fromJson(Map<String, dynamic> json) =>
      _$EventMeetingLocationFromJson(json);
}
