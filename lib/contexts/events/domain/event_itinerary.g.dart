// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_itinerary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventItineraryItem _$EventItineraryItemFromJson(Map<String, dynamic> json) =>
    _EventItineraryItem(
      id: json['id'] as String,
      kind: $enumDecode(_$EventItineraryKindEnumMap, json['kind']),
      offsetMinutes: (json['offsetMinutes'] as num).toInt(),
      durationMinutes: (json['durationMinutes'] as num?)?.toInt(),
      title: json['title'] as String,
      description: json['description'] as String?,
      location: json['location'] == null
          ? null
          : EventMeetingLocation.fromJson(
              json['location'] as Map<String, dynamic>,
            ),
      routeDistanceMeters: (json['routeDistanceMeters'] as num?)?.toInt(),
    );

Map<String, dynamic> _$EventItineraryItemToJson(_EventItineraryItem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'kind': _$EventItineraryKindEnumMap[instance.kind]!,
      'offsetMinutes': instance.offsetMinutes,
      'durationMinutes': instance.durationMinutes,
      'title': instance.title,
      'description': instance.description,
      'location': instance.location?.toJson(),
      'routeDistanceMeters': instance.routeDistanceMeters,
    };

const _$EventItineraryKindEnumMap = {
  EventItineraryKind.gather: 'gather',
  EventItineraryKind.activity: 'activity',
  EventItineraryKind.stop: 'stop',
  EventItineraryKind.breakTime: 'break',
  EventItineraryKind.transition: 'transition',
  EventItineraryKind.finish: 'finish',
};
