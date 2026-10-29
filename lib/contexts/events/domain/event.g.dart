// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Event _$EventFromJson(Map<String, dynamic> json) => _Event(
  id: json['id'] as String,
  synthetic: json['synthetic'] as bool? ?? false,
  seedPrefix: json['seedPrefix'] as String?,
  clubId: readEventOrganizerId(json, 'organizerId') as String,
  sourceVenueId: json['sourceVenueId'] as String?,
  name: json['name'] as String? ?? '',
  startTime: const TimestampConverter().fromJson(json['startTime']),
  eventTimezone: json['eventTimezone'] as String?,
  endTime: const TimestampConverter().fromJson(json['endTime']),
  meetingPoint: json['meetingPoint'] as String,
  meetingLocation: json['meetingLocation'] == null
      ? null
      : EventMeetingLocation.fromJson(
          json['meetingLocation'] as Map<String, dynamic>,
        ),
  startingPointLat: (json['startingPointLat'] as num?)?.toDouble(),
  startingPointLng: (json['startingPointLng'] as num?)?.toDouble(),
  locationDetails: json['locationDetails'] as String?,
  itinerary:
      (json['itinerary'] as List<dynamic>?)
          ?.map((e) => EventItineraryItem.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  photoUrl: json['photoUrl'] as String?,
  eventPhotos:
      (json['eventPhotos'] as List<dynamic>?)
          ?.map((e) => UploadedPhoto.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  eventFormat: json['eventFormat'] == null
      ? const EventFormatSnapshot.socialRun()
      : EventFormatSnapshot.fromJson(
          json['eventFormat'] as Map<String, dynamic>?,
        ),
  distanceKm: (json['distanceKm'] as num).toDouble(),
  pace: $enumDecode(_$PaceLevelEnumMap, json['pace']),
  capacityLimit: (json['capacityLimit'] as num).toInt(),
  description: json['description'] as String,
  priceInPaise: (json['priceInPaise'] as num).toInt(),
  currency: json['currency'] as String? ?? defaultCurrencyCode,
  bookedCount: (json['bookedCount'] as num?)?.toInt(),
  checkedInCount: (json['checkedInCount'] as num?)?.toInt(),
  waitlistedCount: (json['waitlistedCount'] as num?)?.toInt(),
  crossPathsPairHeldCount:
      (json['crossPathsPairHeldCount'] as num?)?.toInt() ?? 0,
  crossPathsPairConfirmedCount:
      (json['crossPathsPairConfirmedCount'] as num?)?.toInt() ?? 0,
  crossPathsPairHeldCohortCounts:
      (json['crossPathsPairHeldCohortCounts'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as num).toInt()),
      ) ??
      const {},
  crossPathsDiscoveryEnabled:
      json['crossPathsDiscoveryEnabled'] as bool? ?? false,
  status:
      $enumDecodeNullable(_$EventLifecycleStatusEnumMap, json['status']) ??
      EventLifecycleStatus.active,
  cancelledAt: const NullableTimestampConverter().fromJson(json['cancelledAt']),
  cancellationReason: json['cancellationReason'] as String?,
  setupRevision: (json['setupRevision'] as num?)?.toInt(),
  publicRegistrationEnabled:
      json['publicRegistrationEnabled'] as bool? ?? false,
  publicRegistrationMode: $enumDecodeNullable(
    _$EventPublicRegistrationModeEnumMap,
    json['publicRegistrationMode'],
    unknownValue: EventPublicRegistrationMode.closed,
  ),
  publicRegistrationRevision:
      (json['publicRegistrationRevision'] as num?)?.toInt() ?? 0,
  constraints: json['constraints'] == null
      ? const EventConstraints()
      : EventConstraints.fromJson(json['constraints'] as Map<String, dynamic>),
  eventPolicy: json['eventPolicy'] == null
      ? null
      : EventPolicyBundle.fromJson(json['eventPolicy'] as Map<String, dynamic>),
  eventOrigin: json['eventOrigin'] == null
      ? null
      : EventOrigin.fromJson(json['eventOrigin'] as Map<String, dynamic>),
  runtimeAccess: json['runtimeAccess'] == null
      ? null
      : EventRuntimeAccess.fromJson(
          json['runtimeAccess'] as Map<String, dynamic>,
        ),
  genderCounts:
      (json['genderCounts'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as num).toInt()),
      ) ??
      const {},
  cohortCounts:
      (json['cohortCounts'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as num).toInt()),
      ) ??
      const {},
  waitlistedCohortCounts:
      (json['waitlistedCohortCounts'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as num).toInt()),
      ) ??
      const {},
);

Map<String, dynamic> _$EventToJson(_Event instance) => <String, dynamic>{
  'organizerId': instance.clubId,
  'sourceVenueId': ?instance.sourceVenueId,
  'name': instance.name,
  'startTime': const TimestampConverter().toJson(instance.startTime),
  'eventTimezone': ?instance.eventTimezone,
  'endTime': const TimestampConverter().toJson(instance.endTime),
  'meetingPoint': instance.meetingPoint,
  'meetingLocation': ?instance.meetingLocation?.toJson(),
  'startingPointLat': instance.startingPointLat,
  'startingPointLng': instance.startingPointLng,
  'locationDetails': instance.locationDetails,
  'itinerary': instance.itinerary.map((e) => e.toJson()).toList(),
  'photoUrl': ?instance.photoUrl,
  'eventPhotos': instance.eventPhotos.map((e) => e.toJson()).toList(),
  'eventFormat': instance.eventFormat.toJson(),
  'distanceKm': instance.distanceKm,
  'pace': _$PaceLevelEnumMap[instance.pace]!,
  'capacityLimit': instance.capacityLimit,
  'description': instance.description,
  'priceInPaise': instance.priceInPaise,
  'currency': instance.currency,
  'bookedCount': ?instance.bookedCount,
  'checkedInCount': ?instance.checkedInCount,
  'waitlistedCount': ?instance.waitlistedCount,
  'crossPathsPairHeldCount': instance.crossPathsPairHeldCount,
  'crossPathsPairConfirmedCount': instance.crossPathsPairConfirmedCount,
  'crossPathsPairHeldCohortCounts': instance.crossPathsPairHeldCohortCounts,
  'crossPathsDiscoveryEnabled': instance.crossPathsDiscoveryEnabled,
  'status': _$EventLifecycleStatusEnumMap[instance.status]!,
  'cancelledAt': const NullableTimestampConverter().toJson(
    instance.cancelledAt,
  ),
  'cancellationReason': instance.cancellationReason,
  'setupRevision': ?instance.setupRevision,
  'publicRegistrationEnabled': instance.publicRegistrationEnabled,
  'publicRegistrationMode':
      ?_$EventPublicRegistrationModeEnumMap[instance.publicRegistrationMode],
  'publicRegistrationRevision': instance.publicRegistrationRevision,
  'constraints': instance.constraints.toJson(),
  'eventPolicy': ?instance.eventPolicy?.toJson(),
  'eventOrigin': ?instance.eventOrigin?.toJson(),
  'runtimeAccess': ?instance.runtimeAccess?.toJson(),
  'genderCounts': instance.genderCounts,
  'cohortCounts': instance.cohortCounts,
  'waitlistedCohortCounts': instance.waitlistedCohortCounts,
};

const _$PaceLevelEnumMap = {
  PaceLevel.easy: 'easy',
  PaceLevel.moderate: 'moderate',
  PaceLevel.fast: 'fast',
  PaceLevel.competitive: 'competitive',
};

const _$EventLifecycleStatusEnumMap = {
  EventLifecycleStatus.active: 'active',
  EventLifecycleStatus.cancelled: 'cancelled',
};

const _$EventPublicRegistrationModeEnumMap = {
  EventPublicRegistrationMode.closed: 'closed',
  EventPublicRegistrationMode.free: 'free',
  EventPublicRegistrationMode.paid: 'paid',
};

_EventOrigin _$EventOriginFromJson(Map<String, dynamic> json) => _EventOrigin(
  mode: $enumDecode(_$EventOriginModeEnumMap, json['mode']),
  bookingAuthority: eventBookingAuthorityFromJson(
    json['bookingAuthority'] as String,
  ),
  rosterAuthority: $enumDecode(
    _$EventRosterAuthorityEnumMap,
    json['rosterAuthority'],
  ),
  provider: externalBookingProviderFromJson(json['provider'] as String),
  externalEventId: json['externalEventId'] as String?,
  externalEventUrl: json['externalEventUrl'] as String?,
  sourceExternalEventId: json['sourceExternalEventId'] as String?,
  adapterVersion: json['adapterVersion'] as String?,
  connectedAt: const NullableTimestampConverter().fromJson(json['connectedAt']),
  connectedBy: json['connectedBy'] as String?,
);

Map<String, dynamic> _$EventOriginToJson(
  _EventOrigin instance,
) => <String, dynamic>{
  'mode': _$EventOriginModeEnumMap[instance.mode]!,
  'bookingAuthority': eventBookingAuthorityToJson(instance.bookingAuthority),
  'rosterAuthority': _$EventRosterAuthorityEnumMap[instance.rosterAuthority]!,
  'provider': externalBookingProviderToJson(instance.provider),
  'externalEventId': instance.externalEventId,
  'externalEventUrl': instance.externalEventUrl,
  'sourceExternalEventId': instance.sourceExternalEventId,
  'adapterVersion': instance.adapterVersion,
  'connectedAt': const NullableTimestampConverter().toJson(
    instance.connectedAt,
  ),
  'connectedBy': instance.connectedBy,
};

const _$EventOriginModeEnumMap = {
  EventOriginMode.catchNative: 'catchNative',
  EventOriginMode.externalCompanion: 'externalCompanion',
};

const _$EventRosterAuthorityEnumMap = {
  EventRosterAuthority.catchProjection: 'catchProjection',
  EventRosterAuthority.hostImport: 'hostImport',
  EventRosterAuthority.providerSync: 'providerSync',
};

_EventRuntimeAccess _$EventRuntimeAccessFromJson(Map<String, dynamic> json) =>
    _EventRuntimeAccess(
      enabled: json['enabled'] as bool,
      publicRuntimeId: json['publicRuntimeId'] as String?,
      walkInPolicy: $enumDecode(
        _$EventRuntimeWalkInPolicyEnumMap,
        json['walkInPolicy'],
      ),
      termsVersion: json['termsVersion'] as String,
    );

Map<String, dynamic> _$EventRuntimeAccessToJson(_EventRuntimeAccess instance) =>
    <String, dynamic>{
      'enabled': instance.enabled,
      'publicRuntimeId': instance.publicRuntimeId,
      'walkInPolicy': _$EventRuntimeWalkInPolicyEnumMap[instance.walkInPolicy]!,
      'termsVersion': instance.termsVersion,
    };

const _$EventRuntimeWalkInPolicyEnumMap = {
  EventRuntimeWalkInPolicy.deny: 'deny',
  EventRuntimeWalkInPolicy.hostApproval: 'hostApproval',
  EventRuntimeWalkInPolicy.autoCreate: 'autoCreate',
};
