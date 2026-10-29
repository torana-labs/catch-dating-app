// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'saved_event.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_SavedEvent _$SavedEventFromJson(Map<String, dynamic> json) => _SavedEvent(
  id: json['id'] as String,
  uid: json['uid'] as String,
  eventId: json['eventId'] as String,
  savedAt: const TimestampConverter().fromJson(json['savedAt']),
);

Map<String, dynamic> _$SavedEventToJson(_SavedEvent instance) =>
    <String, dynamic>{
      'uid': instance.uid,
      'eventId': instance.eventId,
      'savedAt': const TimestampConverter().toJson(instance.savedAt),
    };
