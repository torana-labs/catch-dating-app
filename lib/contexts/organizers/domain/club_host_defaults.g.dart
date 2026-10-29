// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'club_host_defaults.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ClubHostDefaults _$ClubHostDefaultsFromJson(Map<String, dynamic> json) =>
    _ClubHostDefaults(
      primaryActivityKind:
          $enumDecodeNullable(
            _$ActivityKindEnumMap,
            json['primaryActivityKind'],
          ) ??
          ActivityKind.socialRun,
      supportedActivityKinds:
          (json['supportedActivityKinds'] as List<dynamic>?)
              ?.map((e) => $enumDecode(_$ActivityKindEnumMap, e))
              .toList() ??
          const <ActivityKind>[],
      eventPolicy: json['eventPolicy'] == null
          ? const EventPolicyDefaults()
          : EventPolicyDefaults.fromJson(
              json['eventPolicy'] as Map<String, dynamic>,
            ),
      eventSuccess: json['eventSuccess'] == null
          ? const EventSuccessDefaults()
          : EventSuccessDefaults.fromJson(
              json['eventSuccess'] as Map<String, dynamic>,
            ),
      eventSuccessByActivityKind:
          (json['eventSuccessByActivityKind'] as Map<String, dynamic>?)?.map(
            (k, e) => MapEntry(
              k,
              EventSuccessDefaults.fromJson(e as Map<String, dynamic>),
            ),
          ) ??
          const <String, EventSuccessDefaults>{},
      timezone: json['timezone'] as String?,
      revision: (json['revision'] as num?)?.toInt(),
    );

Map<String, dynamic> _$ClubHostDefaultsToJson(
  _ClubHostDefaults instance,
) => <String, dynamic>{
  'primaryActivityKind': _$ActivityKindEnumMap[instance.primaryActivityKind]!,
  'supportedActivityKinds': instance.supportedActivityKinds
      .map((e) => _$ActivityKindEnumMap[e]!)
      .toList(),
  'eventPolicy': instance.eventPolicy.toJson(),
  'eventSuccess': instance.eventSuccess.toJson(),
  'eventSuccessByActivityKind': instance.eventSuccessByActivityKind.map(
    (k, e) => MapEntry(k, e.toJson()),
  ),
};

const _$ActivityKindEnumMap = {
  ActivityKind.socialRun: 'socialRun',
  ActivityKind.running: 'running',
  ActivityKind.walking: 'walking',
  ActivityKind.pickleball: 'pickleball',
  ActivityKind.padel: 'padel',
  ActivityKind.tennis: 'tennis',
  ActivityKind.badminton: 'badminton',
  ActivityKind.cycling: 'cycling',
  ActivityKind.spinClass: 'spinClass',
  ActivityKind.yoga: 'yoga',
  ActivityKind.strengthTraining: 'strengthTraining',
  ActivityKind.pubQuiz: 'pubQuiz',
  ActivityKind.barCrawl: 'barCrawl',
  ActivityKind.dinner: 'dinner',
  ActivityKind.singlesMixer: 'singlesMixer',
  ActivityKind.openActivity: 'openActivity',
};
