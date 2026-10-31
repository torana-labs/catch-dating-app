// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_domain_classes.mjs
// Then run: dart run build_runner build
//
// Data shape emitted from contracts/firestore/events.schema.json.
// Derived behavior, if any, lives in a hand-written companion extension file.
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_types.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:catch_dating_app/kernel/labelled.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

export 'event_extensions.dart';
export 'event_meeting_location.dart';
export 'event_types.dart';

part 'event.freezed.dart';
part 'event.g.dart';

enum PaceLevel implements Labelled {
  easy('Easy'),
  moderate('Moderate'),
  fast('Fast'),
  competitive('Competitive');

  const PaceLevel(this.label);
  @override
  final String label;
}

enum EventLifecycleStatus { active, cancelled }

enum EventPublicRegistrationMode { closed, free, paid }

enum EventOriginMode { catchNative, externalCompanion }

enum EventBookingAuthority {
  @JsonValue('catch')
  catchPlatform,
  external,
}

enum EventRosterAuthority { catchProjection, hostImport, providerSync }

enum ExternalBookingProvider {
  @JsonValue('catch')
  catchPlatform,
  generic,
  luma,
  eventbrite,
  partiful,
  posh,
  bookmyshow,
  district,
  sortmyscene,
  airbnb,
}

enum EventRuntimeWalkInPolicy { deny, hostApproval, autoCreate }

@freezed
abstract class Event with _$Event {
  const factory Event({
    @JsonKey(includeToJson: false) required String id,
    @JsonKey(includeToJson: false) @Default(false) bool synthetic,
    @JsonKey(includeToJson: false) String? seedPrefix,
    required String organizerId,
    @JsonKey(includeIfNull: false) String? sourceVenueId,
    @Default('') String name,
    @TimestampConverter() required DateTime startTime,
    @JsonKey(includeIfNull: false) String? eventTimezone,
    @TimestampConverter() required DateTime endTime,
    required String meetingPoint,
    @JsonKey(includeIfNull: false) EventMeetingLocation? meetingLocation,
    double? startingPointLat,
    double? startingPointLng,
    String? locationDetails,
    @Default([]) List<EventItineraryItem> itinerary,
    @JsonKey(includeIfNull: false) String? photoUrl,
    @Default([]) List<UploadedPhoto> eventPhotos,
    @Default(EventFormatSnapshot.socialRun()) EventFormatSnapshot eventFormat,
    required double distanceKm,
    required PaceLevel pace,
    required int capacityLimit,
    required String description,
    required int priceInPaise,
    @Default(defaultCurrencyCode) String currency,
    @JsonKey(includeIfNull: false) int? bookedCount,
    @JsonKey(includeIfNull: false) int? checkedInCount,
    @JsonKey(includeIfNull: false) int? waitlistedCount,
    @Default(0) int crossPathsPairHeldCount,
    @Default(0) int crossPathsPairConfirmedCount,
    @Default({}) Map<String, int> crossPathsPairHeldCohortCounts,
    @Default(false) bool crossPathsDiscoveryEnabled,
    @Default(EventLifecycleStatus.active) EventLifecycleStatus status,
    @NullableTimestampConverter() DateTime? cancelledAt,
    String? cancellationReason,
    @JsonKey(includeIfNull: false) int? setupRevision,
    @Default(false) bool publicRegistrationEnabled,
    @JsonKey(
      includeIfNull: false,
      unknownEnumValue: EventPublicRegistrationMode.closed,
    )
    EventPublicRegistrationMode? publicRegistrationMode,
    @Default(0) int publicRegistrationRevision,
    @Default(EventConstraints()) EventConstraints constraints,
    @JsonKey(includeIfNull: false) EventPolicyBundle? eventPolicy,
    @JsonKey(includeIfNull: false) EventOrigin? eventOrigin,
    @JsonKey(includeIfNull: false) EventRuntimeAccess? runtimeAccess,
    @Default({}) Map<String, int> genderCounts,
    @Default({}) Map<String, int> cohortCounts,
    @Default({}) Map<String, int> waitlistedCohortCounts,
  }) = _Event;

  factory Event.fromJson(Map<String, dynamic> json) => _$EventFromJson(json);
}

@freezed
abstract class EventOrigin with _$EventOrigin {
  const factory EventOrigin({
    required EventOriginMode mode,
    @JsonKey(
      fromJson: eventBookingAuthorityFromJson,
      toJson: eventBookingAuthorityToJson,
    )
    required EventBookingAuthority bookingAuthority,
    required EventRosterAuthority rosterAuthority,
    @JsonKey(
      fromJson: externalBookingProviderFromJson,
      toJson: externalBookingProviderToJson,
    )
    required ExternalBookingProvider provider,
    String? externalEventId,
    String? externalEventUrl,
    String? sourceExternalEventId,
    String? adapterVersion,
    @NullableTimestampConverter() DateTime? connectedAt,
    String? connectedBy,
  }) = _EventOrigin;

  factory EventOrigin.fromJson(Map<String, dynamic> json) =>
      _$EventOriginFromJson(json);
}

@freezed
abstract class EventRuntimeAccess with _$EventRuntimeAccess {
  const factory EventRuntimeAccess({
    required bool enabled,
    String? publicRuntimeId,
    required EventRuntimeWalkInPolicy walkInPolicy,
    required String termsVersion,
  }) = _EventRuntimeAccess;

  factory EventRuntimeAccess.fromJson(Map<String, dynamic> json) =>
      _$EventRuntimeAccessFromJson(json);
}
