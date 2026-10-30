// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_draft.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OrganizerDraft _$OrganizerDraftFromJson(Map<String, dynamic> json) => _OrganizerDraft(
  savedAt: DateTime.parse(json['savedAt'] as String),
  name: json['name'] as String?,
  area: json['area'] as String?,
  description: json['description'] as String?,
  location: json['location'] as String?,
  instagramHandle: json['instagramHandle'] as String?,
  phoneNumber: json['phoneNumber'] as String?,
  email: json['email'] as String?,
  organizerType:
      $enumDecodeNullable(_$OrganizerTypeEnumMap, json['organizerType']) ??
      OrganizerType.club,
  hostDefaults: json['hostDefaults'] == null
      ? const OrganizerHostDefaults()
      : OrganizerHostDefaults.fromJson(json['hostDefaults'] as Map<String, dynamic>),
);

Map<String, dynamic> _$OrganizerDraftToJson(_OrganizerDraft instance) =>
    <String, dynamic>{
      'savedAt': instance.savedAt.toIso8601String(),
      'name': instance.name,
      'area': instance.area,
      'description': instance.description,
      'location': instance.location,
      'instagramHandle': instance.instagramHandle,
      'phoneNumber': instance.phoneNumber,
      'email': instance.email,
      'organizerType': _$OrganizerTypeEnumMap[instance.organizerType]!,
      'hostDefaults': instance.hostDefaults.toJson(),
    };

const _$OrganizerTypeEnumMap = {
  OrganizerType.club: 'club',
  OrganizerType.community: 'community',
  OrganizerType.individual: 'individual',
  OrganizerType.eventProducer: 'eventProducer',
  OrganizerType.venue: 'venue',
  OrganizerType.brand: 'brand',
};
