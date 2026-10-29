// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_meeting_location.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventMeetingLocation _$EventMeetingLocationFromJson(
  Map<String, dynamic> json,
) => _EventMeetingLocation(
  name: json['name'] as String,
  address: json['address'] as String?,
  placeId: json['placeId'] as String?,
  latitude: (json['latitude'] as num).toDouble(),
  longitude: (json['longitude'] as num).toDouble(),
  notes: json['notes'] as String?,
);

Map<String, dynamic> _$EventMeetingLocationToJson(
  _EventMeetingLocation instance,
) => <String, dynamic>{
  'name': instance.name,
  'address': instance.address,
  'placeId': instance.placeId,
  'latitude': instance.latitude,
  'longitude': instance.longitude,
  'notes': instance.notes,
};
