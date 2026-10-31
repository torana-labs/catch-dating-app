// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';


// Typed callable request DTO emitted from callables/create_event_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Nested private-access payload accepted by createEvent.
final class CreateEventPrivateAccess {
  const CreateEventPrivateAccess({this.inviteCode});

  final String? inviteCode;

  Map<String, Object?> toJson() => {
    'inviteCode': ?inviteCode,
  };
}

/// Callable payload accepted by createEvent.
final class CreateEventCallableRequest {
  const CreateEventCallableRequest({
    this.eventId,
    required this.name,
    required this.organizerId,
    this.sourceVenueId,
    required this.startTimeMillis,
    required this.endTimeMillis,
    required this.meetingPoint,
    required this.meetingLocation,
    required this.startingPointLat,
    required this.startingPointLng,
    this.locationDetails,
    this.itinerary,
    this.photoUrl,
    this.eventPhotos,
    required this.distanceKm,
    required this.pace,
    required this.capacityLimit,
    required this.description,
    required this.priceInPaise,
    this.currency,
    this.eventPolicy,
    this.privateAccess,
    this.eventFormat,
    this.eventSuccessDefaults,
    this.externalOrigin,
    this.runtimeWalkInPolicy,
    this.constraints,
  });

  final String? eventId;
  final String name;
  final String organizerId;
  final String? sourceVenueId;
  final int startTimeMillis;
  final int endTimeMillis;
  final String meetingPoint;
  final EventMeetingLocation meetingLocation;
  final double startingPointLat;
  final double startingPointLng;
  final String? locationDetails;
  final List<Map<String, Object?>>? itinerary;
  final String? photoUrl;
  final List<Map<String, Object?>>? eventPhotos;
  final double distanceKm;
  final String pace;
  final int capacityLimit;
  final String description;
  final int priceInPaise;
  final String? currency;
  final EventPolicyBundle? eventPolicy;
  final CreateEventPrivateAccess? privateAccess;
  final EventFormatSnapshot? eventFormat;
  final EventSuccessDefaults? eventSuccessDefaults;
  final Map<String, Object?>? externalOrigin;
  final String? runtimeWalkInPolicy;
  final EventConstraints? constraints;

  Map<String, Object?> toJson() => {
    'eventId': ?eventId,
    'name': name,
    'organizerId': organizerId,
    'sourceVenueId': ?sourceVenueId,
    'startTimeMillis': startTimeMillis,
    'endTimeMillis': endTimeMillis,
    'meetingPoint': meetingPoint,
    'meetingLocation': meetingLocation.toJson(),
    'startingPointLat': startingPointLat,
    'startingPointLng': startingPointLng,
    'locationDetails': ?locationDetails,
    'itinerary': ?itinerary,
    'photoUrl': ?photoUrl,
    'eventPhotos': ?eventPhotos,
    'distanceKm': distanceKm,
    'pace': pace,
    'capacityLimit': capacityLimit,
    'description': description,
    'priceInPaise': priceInPaise,
    'currency': ?currency,
    'eventPolicy': ?eventPolicy?.toJson(),
    'privateAccess': ?privateAccess?.toJson(),
    'eventFormat': ?eventFormat?.toJson(),
    'eventSuccessDefaults': ?eventSuccessDefaults?.toJson(),
    'externalOrigin': ?externalOrigin,
    'runtimeWalkInPolicy': ?runtimeWalkInPolicy,
    'constraints': ?constraints?.toJson(),
  };
}
