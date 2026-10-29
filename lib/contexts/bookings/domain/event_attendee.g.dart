// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_attendee.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventAttendee _$EventAttendeeFromJson(
  Map<String, dynamic> json,
) => _EventAttendee(
  id: json['id'] as String,
  eventId: json['eventId'] as String,
  clubId: json['clubId'] as String,
  organizerId: json['organizerId'] as String,
  displayName: json['displayName'] as String,
  searchName: json['searchName'] as String,
  source: $enumDecode(_$EventAttendeeSourceEnumMap, json['source']),
  status: $enumDecode(_$EventAttendeeStatusEnumMap, json['status']),
  linkedUid: json['linkedUid'] as String?,
  phoneE164: json['phoneE164'] as String?,
  email: json['email'] as String?,
  externalReference: json['externalReference'] as String?,
  arrivalGroup: json['arrivalGroup'] as String?,
  ticketType: json['ticketType'] as String?,
  revenueAmountMinor: (json['revenueAmountMinor'] as num?)?.toInt(),
  revenueCurrency: json['revenueCurrency'] as String?,
  revenueSource: $enumDecodeNullable(
    _$EventAttendeeRevenueSourceEnumMap,
    json['revenueSource'],
  ),
  revenueAllocation: $enumDecodeNullable(
    _$EventAttendeeRevenueAllocationEnumMap,
    json['revenueAllocation'],
  ),
  revenueOrderReference: json['revenueOrderReference'] as String?,
  revenueOrderAmountMinor: (json['revenueOrderAmountMinor'] as num?)?.toInt(),
  importId: json['importId'] as String?,
  sourceRowId: json['sourceRowId'] as String?,
  provider: $enumDecodeNullable(
    _$ExternalBookingProviderEnumMap,
    json['provider'],
  ),
  providerConnectionId: json['providerConnectionId'] as String?,
  providerGuestId: json['providerGuestId'] as String?,
  providerSyncedAt: const NullableTimestampConverter().fromJson(
    json['providerSyncedAt'],
  ),
  providerDataRevision: (json['providerDataRevision'] as num?)?.toInt() ?? 0,
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
  updatedAt: const TimestampConverter().fromJson(json['updatedAt']),
  registeredAt: const NullableTimestampConverter().fromJson(
    json['registeredAt'],
  ),
  waitlistedAt: const NullableTimestampConverter().fromJson(
    json['waitlistedAt'],
  ),
  checkedInAt: const NullableTimestampConverter().fromJson(json['checkedInAt']),
  cancelledAt: const NullableTimestampConverter().fromJson(json['cancelledAt']),
  checkedInBy: json['checkedInBy'] as String?,
  linkedAt: const NullableTimestampConverter().fromJson(json['linkedAt']),
  attendanceRevision: (json['attendanceRevision'] as num?)?.toInt() ?? 0,
  preCheckInStatus: $enumDecodeNullable(
    _$EventAttendeeStatusEnumMap,
    json['preCheckInStatus'],
  ),
  accountabilityResolution: $enumDecodeNullable(
    _$EventSuccessAccountabilityResolutionEnumMap,
    json['accountabilityResolution'],
  ),
  accountabilityResolvedForCheckInAt: const NullableTimestampConverter()
      .fromJson(json['accountabilityResolvedForCheckInAt']),
  accountabilityResolvedAt: const NullableTimestampConverter().fromJson(
    json['accountabilityResolvedAt'],
  ),
  accountabilityResolvedBy: json['accountabilityResolvedBy'] as String?,
);

Map<String, dynamic> _$EventAttendeeToJson(
  _EventAttendee instance,
) => <String, dynamic>{
  'eventId': instance.eventId,
  'clubId': instance.clubId,
  'organizerId': instance.organizerId,
  'displayName': instance.displayName,
  'searchName': instance.searchName,
  'source': _$EventAttendeeSourceEnumMap[instance.source]!,
  'status': _$EventAttendeeStatusEnumMap[instance.status]!,
  'linkedUid': instance.linkedUid,
  'phoneE164': instance.phoneE164,
  'email': instance.email,
  'externalReference': instance.externalReference,
  'arrivalGroup': instance.arrivalGroup,
  'ticketType': instance.ticketType,
  'revenueAmountMinor': instance.revenueAmountMinor,
  'revenueCurrency': instance.revenueCurrency,
  'revenueSource': _$EventAttendeeRevenueSourceEnumMap[instance.revenueSource],
  'revenueAllocation':
      _$EventAttendeeRevenueAllocationEnumMap[instance.revenueAllocation],
  'revenueOrderReference': instance.revenueOrderReference,
  'revenueOrderAmountMinor': instance.revenueOrderAmountMinor,
  'importId': instance.importId,
  'sourceRowId': instance.sourceRowId,
  'provider': _$ExternalBookingProviderEnumMap[instance.provider],
  'providerConnectionId': instance.providerConnectionId,
  'providerGuestId': instance.providerGuestId,
  'providerSyncedAt': const NullableTimestampConverter().toJson(
    instance.providerSyncedAt,
  ),
  'providerDataRevision': instance.providerDataRevision,
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
  'updatedAt': const TimestampConverter().toJson(instance.updatedAt),
  'registeredAt': const NullableTimestampConverter().toJson(
    instance.registeredAt,
  ),
  'waitlistedAt': const NullableTimestampConverter().toJson(
    instance.waitlistedAt,
  ),
  'checkedInAt': const NullableTimestampConverter().toJson(
    instance.checkedInAt,
  ),
  'cancelledAt': const NullableTimestampConverter().toJson(
    instance.cancelledAt,
  ),
  'checkedInBy': instance.checkedInBy,
  'linkedAt': const NullableTimestampConverter().toJson(instance.linkedAt),
  'attendanceRevision': instance.attendanceRevision,
  'preCheckInStatus': _$EventAttendeeStatusEnumMap[instance.preCheckInStatus],
  'accountabilityResolution':
      _$EventSuccessAccountabilityResolutionEnumMap[instance
          .accountabilityResolution],
  'accountabilityResolvedForCheckInAt': const NullableTimestampConverter()
      .toJson(instance.accountabilityResolvedForCheckInAt),
  'accountabilityResolvedAt': const NullableTimestampConverter().toJson(
    instance.accountabilityResolvedAt,
  ),
  'accountabilityResolvedBy': instance.accountabilityResolvedBy,
};

const _$EventAttendeeSourceEnumMap = {
  EventAttendeeSource.catchBooking: 'catchBooking',
  EventAttendeeSource.hostImport: 'hostImport',
  EventAttendeeSource.hostManual: 'hostManual',
  EventAttendeeSource.webOtp: 'webOtp',
  EventAttendeeSource.providerSync: 'providerSync',
};

const _$EventAttendeeStatusEnumMap = {
  EventAttendeeStatus.invited: 'invited',
  EventAttendeeStatus.registered: 'registered',
  EventAttendeeStatus.waitlisted: 'waitlisted',
  EventAttendeeStatus.checkedIn: 'checkedIn',
  EventAttendeeStatus.cancelled: 'cancelled',
};

const _$EventAttendeeRevenueSourceEnumMap = {
  EventAttendeeRevenueSource.hostImport: 'hostImport',
  EventAttendeeRevenueSource.hostEstimate: 'hostEstimate',
  EventAttendeeRevenueSource.providerOrder: 'providerOrder',
};

const _$EventAttendeeRevenueAllocationEnumMap = {
  EventAttendeeRevenueAllocation.perAttendee: 'perAttendee',
  EventAttendeeRevenueAllocation.sharedOrder: 'sharedOrder',
};

const _$ExternalBookingProviderEnumMap = {
  ExternalBookingProvider.catchPlatform: 'catchPlatform',
  ExternalBookingProvider.generic: 'generic',
  ExternalBookingProvider.luma: 'luma',
  ExternalBookingProvider.eventbrite: 'eventbrite',
  ExternalBookingProvider.partiful: 'partiful',
  ExternalBookingProvider.posh: 'posh',
  ExternalBookingProvider.bookmyshow: 'bookmyshow',
  ExternalBookingProvider.district: 'district',
  ExternalBookingProvider.sortmyscene: 'sortmyscene',
  ExternalBookingProvider.airbnb: 'airbnb',
};

const _$EventSuccessAccountabilityResolutionEnumMap = {
  EventSuccessAccountabilityResolution.returned: 'returned',
  EventSuccessAccountabilityResolution.departed: 'departed',
};
