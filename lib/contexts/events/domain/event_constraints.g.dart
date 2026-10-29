// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_constraints.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventConstraints _$EventConstraintsFromJson(Map<String, dynamic> json) =>
    _EventConstraints(
      minAge: (json['minAge'] as num?)?.toInt() ?? 0,
      maxAge: (json['maxAge'] as num?)?.toInt() ?? 99,
      maxMen: (json['maxMen'] as num?)?.toInt(),
      maxWomen: (json['maxWomen'] as num?)?.toInt(),
    );

Map<String, dynamic> _$EventConstraintsToJson(_EventConstraints instance) =>
    <String, dynamic>{
      'minAge': instance.minAge,
      'maxAge': instance.maxAge,
      'maxMen': instance.maxMen,
      'maxWomen': instance.maxWomen,
    };
