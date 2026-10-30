import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_basics.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/media/uploaded_photo.dart';
import 'package:catch_dating_app/platform/schema_contracts/field_value_validation.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';

export 'package:catch_dating_app/contexts/events/domain/private_event_setup_basics.dart';
export 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';

class PrivateEventCreateReceipt {
  const PrivateEventCreateReceipt({
    required this.eventId,
    required this.setupRevision,
    required this.replayed,
  });

  final String eventId;
  final int setupRevision;
  final bool replayed;

  factory PrivateEventCreateReceipt.fromResponse(Object? response) {
    if (response is! Map) throw const FormatException('Invalid event receipt');
    final data = Map<String, Object?>.from(response);
    final eventId = data['eventId'];
    final setupRevision = data['setupRevision'];
    final replayed = data['replayed'];
    if (eventId is! String ||
        eventId.isEmpty ||
        setupRevision is! int ||
        setupRevision < 1 ||
        replayed is! bool) {
      throw const FormatException('Invalid event setup receipt');
    }
    return PrivateEventCreateReceipt(
      eventId: eventId,
      setupRevision: setupRevision,
      replayed: replayed,
    );
  }
}

/// The exact update command is caller-owned across retries. In particular,
/// [requestId], [expectedSetupRevision], and [basics] must not change after a
/// request might have reached the server.
class PrivateEventBasicsUpdateRequest {
  const PrivateEventBasicsUpdateRequest({
    required this.organizerId,
    required this.eventId,
    required this.requestId,
    required this.expectedSetupRevision,
    required this.basics,
  });

  final String organizerId;
  final String eventId;
  final String requestId;
  final int expectedSetupRevision;
  final PrivateEventBasics basics;

  factory PrivateEventBasicsUpdateRequest.fromJson(Map<String, dynamic> json) {
    final organizerId = json['organizerId'];
    final eventId = json['eventId'];
    final requestId = json['requestId'];
    final expectedSetupRevision = json['expectedSetupRevision'];
    final rawBasics = json['basics'];
    if (organizerId is! String ||
        eventId is! String ||
        requestId is! String ||
        expectedSetupRevision is! int ||
        rawBasics is! Map) {
      throw const FormatException('Invalid saved basics update');
    }
    final request = PrivateEventBasicsUpdateRequest(
      organizerId: organizerId,
      eventId: eventId,
      requestId: requestId,
      expectedSetupRevision: expectedSetupRevision,
      basics: PrivateEventBasics.fromJson(Map<String, dynamic>.from(rawBasics)),
    );
    if (!request.isValid) {
      throw const FormatException('Invalid saved basics update');
    }
    return request;
  }

  bool get isValid =>
      organizerId.trim().isNotEmpty &&
      eventId.trim().isNotEmpty &&
      requestId.trim().isNotEmpty &&
      expectedSetupRevision >= 1 &&
      basics.isValid;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'requestId': requestId,
    'expectedSetupRevision': expectedSetupRevision,
    'basics': basics.toJson(),
  };
}

/// Explicit terms for one event; these do not open public registration.
class PrivateEventAdmissionTerms {
  const PrivateEventAdmissionTerms({
    required this.capacityLimit,
    required this.priceInPaise,
    required this.currency,
    required this.cancellationPolicyId,
  });
  final int capacityLimit;
  final int priceInPaise;
  final String currency;
  final String cancellationPolicyId;
  bool get isValid =>
      acceptsContractValue(
        CatchContractConstraints
            .updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCapacityLimit,
        capacityLimit,
      ) &&
      acceptsContractValue(
        CatchContractConstraints
            .updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsPriceInPaise,
        priceInPaise,
      ) &&
      acceptsContractValue(
        CatchContractConstraints
            .updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCurrency,
        currency,
      ) &&
      acceptsContractValue(
        CatchContractConstraints
            .updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCancellationPolicyId,
        cancellationPolicyId,
      ) &&
      (priceInPaise == 0
          ? cancellationPolicyId == 'notApplicable'
          : cancellationPolicyId != 'notApplicable');
  Map<String, Object?> toJson() => {
    'capacityLimit': capacityLimit,
    'priceInPaise': priceInPaise,
    'currency': currency,
    'cancellationPolicyId': cancellationPolicyId,
  };
  factory PrivateEventAdmissionTerms.fromResponse(Object? raw) {
    if (raw is! Map ||
        raw.length != 4 ||
        raw['capacityLimit'] is! int ||
        raw['priceInPaise'] is! int ||
        raw['currency'] is! String ||
        raw['cancellationPolicyId'] is! String) {
      throw const FormatException('Invalid event admission terms');
    }
    final result = PrivateEventAdmissionTerms(
      capacityLimit: raw['capacityLimit'] as int,
      priceInPaise: raw['priceInPaise'] as int,
      currency: raw['currency'] as String,
      cancellationPolicyId: raw['cancellationPolicyId'] as String,
    );
    if (!result.isValid) throw const FormatException('Invalid admission terms');
    return result;
  }
}

/// Actual optional event fields, as opposed to organizer recommendations.
class PrivateEventDetailsSnapshot {
  const PrivateEventDetailsSnapshot({
    this.endTimeMillis,
    this.venueName,
    this.meetingLocation,
    this.sourceVenueId,
    this.eventFormat,
    this.description,
    this.itinerary = const [],
    this.eventPhotos = const [],
    this.admissionTerms,
    this.distanceKm,
    this.pace,
  });

  final List<EventItineraryItem> itinerary;
  final List<UploadedPhoto> eventPhotos;
  final String? description;
  final PrivateEventAdmissionTerms? admissionTerms;
  final double? distanceKm;
  final String? pace;
  final int? endTimeMillis;
  final String? venueName;
  final EventMeetingLocation? meetingLocation;
  final String? sourceVenueId;
  final EventFormatSnapshot? eventFormat;

  factory PrivateEventDetailsSnapshot.fromResponse(Object? response) {
    if (response is! Map) throw const FormatException('Invalid event details');
    final data = Map<String, Object?>.from(response);
    if (data.length < 4 ||
        data.length > 11 ||
        data.keys.toSet().difference({
          'endTimeMillis',
          'venueName',
          'sourceVenueId',
          'eventFormat',
          'meetingLocation',
          'description',
          'itinerary',
          'eventPhotos',
          'admissionTerms',
          'distanceKm',
          'pace',
        }).isNotEmpty ||
        (data['endTimeMillis'] != null && data['endTimeMillis'] is! int) ||
        (data['venueName'] != null &&
            (data['venueName'] is! String ||
                (data['venueName'] as String).trim().isEmpty)) ||
        (data['sourceVenueId'] != null && data['sourceVenueId'] is! String)) {
      throw const FormatException('Invalid event details');
    }
    if ((data['description'] != null &&
            (data['description'] is! String ||
                (data['description'] as String).length > 2000)) ||
        (data['distanceKm'] != null &&
            (data['distanceKm'] is! num ||
                !(data['distanceKm'] as num).isFinite ||
                (data['distanceKm'] as num) < 0 ||
                (data['distanceKm'] as num) > 100)) ||
        (data['pace'] != null &&
            !const {
              'easy',
              'moderate',
              'fast',
              'competitive',
            }.contains(data['pace']))) {
      throw const FormatException('Invalid event listing details');
    }
    final rawFormat = data['eventFormat'];
    EventFormatSnapshot? format;
    if (rawFormat != null) {
      if (rawFormat is! Map) {
        throw const FormatException('Invalid event format');
      }
      final formatData = Map<String, Object?>.from(rawFormat);
      if (formatData['version'] != 1 ||
          !ActivityKind.values.any(
            (v) => v.name == formatData['activityKind'],
          ) ||
          !EventInteractionModel.values.any(
            (v) => v.name == formatData['interactionModel'],
          )) {
        throw const FormatException('Invalid event format');
      }
      format = EventFormatSnapshot.fromJson(
        Map<String, dynamic>.from(formatData),
      );
    }
    final rawLocation = data['meetingLocation'];
    final location = rawLocation == null
        ? null
        : EventMeetingLocation.fromJson(
            Map<String, dynamic>.from(rawLocation as Map),
          );
    if (location != null &&
        (location.name.trim().isEmpty ||
            !location.latitude.isFinite ||
            location.latitude.abs() > 90 ||
            !location.longitude.isFinite ||
            location.longitude.abs() > 180)) {
      throw const FormatException('Invalid meeting location');
    }
    return PrivateEventDetailsSnapshot(
      meetingLocation: location,
      description: data['description'] as String?,
      itinerary: data['itinerary'] == null
          ? const []
          : (data['itinerary'] as List)
                .map(
                  (item) => EventItineraryItem.fromJson(
                    Map<String, dynamic>.from(item as Map),
                  ),
                )
                .toList(),
      eventPhotos: data['eventPhotos'] == null
          ? const []
          : (data['eventPhotos'] as List)
                .map(
                  (item) => privateEventPhotoFromJson(
                    Map<String, dynamic>.from(item as Map),
                  ),
                )
                .toList(),
      distanceKm: (data['distanceKm'] as num?)?.toDouble(),
      pace: data['pace'] as String?,
      admissionTerms: data['admissionTerms'] == null
          ? null
          : PrivateEventAdmissionTerms.fromResponse(data['admissionTerms']),
      endTimeMillis: data['endTimeMillis'] as int?,
      venueName: data['venueName'] as String?,
      sourceVenueId: data['sourceVenueId'] as String?,
      eventFormat: format,
    );
  }
}

class EventPublicationReadiness {
  const EventPublicationReadiness({
    required this.canPublish,
    required this.missing,
  });
  final bool canPublish;
  final List<String> missing;
  static const requirements = {
    'futureActive',
    'organizerVisibility',
    'duration',
    'venue',
    'format',
    'description',
    'admissionTerms',
    'distancePace',
    'contract',
  };
  factory EventPublicationReadiness.fromResponse(Object? raw) {
    if (raw is! Map ||
        raw.length != 2 ||
        raw['canPublish'] is! bool ||
        raw['missing'] is! List) {
      throw const FormatException('Invalid publication readiness');
    }
    final items = raw['missing'] as List;
    if (items.any((value) => !requirements.contains(value)) ||
        items.toSet().length != items.length ||
        (raw['canPublish'] == true && items.isNotEmpty)) {
      throw const FormatException('Invalid publication requirements');
    }
    return EventPublicationReadiness(
      canPublish: raw['canPublish'] as bool,
      missing: List<String>.unmodifiable(items.cast<String>()),
    );
  }
}

/// Manager-only projection of an already-saved basic event. It intentionally
/// has no rich Event defaults; a partial private setup cannot be decoded as a
/// public event.
class PrivateEventBasicSummary {
  const PrivateEventBasicSummary({
    required this.eventId,
    required this.organizerId,
    required this.setupRevision,
    required this.name,
    required this.city,
    required this.localDate,
    required this.localStartTime,
    required this.timezone,
    required this.startTimeMillis,
    required this.status,
    required this.setupDefaults,
    required this.detailsConfigured,
    required this.eventPreferences,
    this.publicationState = 'private',
    this.publicationReadiness,
    this.canEditBasics = false,
    this.canChangeCity = false,
    this.eventDetails = const PrivateEventDetailsSnapshot(),
  });

  final String eventId;
  final String organizerId;
  final int setupRevision;
  final String name;
  final EventSetupCity city;
  final String localDate;
  final String localStartTime;
  final String timezone;
  final int startTimeMillis;
  final String status;
  final String publicationState;
  final EventPublicationReadiness? publicationReadiness;
  final Map<String, Object?> setupDefaults;
  final bool detailsConfigured;
  final PrivateEventPreferencesSnapshot? eventPreferences;
  final PrivateEventDetailsSnapshot eventDetails;
  final bool canEditBasics;
  final bool canChangeCity;

  factory PrivateEventBasicSummary.fromResponse(Object? response) {
    if (response is! Map) {
      throw const FormatException('Invalid private event summary');
    }
    final data = Map<String, Object?>.from(response);
    final rawCity = data['city'];
    if (rawCity is! Map) {
      throw const FormatException('Invalid private event city');
    }
    final cityData = Map<String, Object?>.from(rawCity);
    final cityId = cityData['cityId'];
    final marketId = cityData['marketId'];
    final eventId = data['eventId'];
    final organizerId = data['organizerId'];
    final setupRevision = data['setupRevision'];
    final name = data['name'];
    final localDate = data['localDate'];
    final localStartTime = data['localStartTime'];
    final timezone = data['timezone'];
    final startTimeMillis = data['startTimeMillis'];
    final status = data['status'];
    final setupDefaults = data['setupDefaults'];
    final detailsConfigured = data['detailsConfigured'];
    final canEditBasics = data['canEditBasics'];
    final canChangeCity = data['canChangeCity'];
    final rawEventDetails = data['eventDetails'];
    if (eventId is! String ||
        eventId.trim().isEmpty ||
        organizerId is! String ||
        organizerId.trim().isEmpty ||
        setupRevision is! int ||
        setupRevision < 1 ||
        name is! String ||
        cityId is! String ||
        marketId is! String ||
        localDate is! String ||
        localStartTime is! String ||
        timezone is! String ||
        startTimeMillis is! int ||
        (status != 'active' && status != 'cancelled') ||
        !const {'private', 'published'}.contains(data['publicationState']) ||
        (data['publicationState'] == 'published' &&
            (canEditBasics == true || canChangeCity == true)) ||
        setupDefaults is! Map ||
        detailsConfigured is! bool ||
        canEditBasics is! bool ||
        canChangeCity is! bool ||
        (canChangeCity && !canEditBasics) ||
        (status == 'cancelled' && (canEditBasics || canChangeCity))) {
      throw const FormatException('Invalid private event summary');
    }
    final city = EventSetupCity(cityId: cityId, marketId: marketId);
    final basics = PrivateEventBasics(
      name: name,
      city: EventSetupValue.set(city),
      localDate: localDate,
      localStartTime: localStartTime,
      timezone: EventSetupValue.set(timezone),
    );
    if (!basics.isValid) {
      throw const FormatException('Invalid private event basics');
    }
    return PrivateEventBasicSummary(
      eventId: eventId,
      organizerId: organizerId,
      setupRevision: setupRevision,
      name: name,
      city: city,
      localDate: localDate,
      localStartTime: localStartTime,
      timezone: timezone,
      startTimeMillis: startTimeMillis,
      status: status as String,
      publicationState: data['publicationState'] as String,
      publicationReadiness: data['publicationReadiness'] == null
          ? null
          : EventPublicationReadiness.fromResponse(
              data['publicationReadiness'],
            ),
      setupDefaults: Map<String, Object?>.from(setupDefaults),
      detailsConfigured: detailsConfigured,
      canEditBasics: canEditBasics,
      canChangeCity: canChangeCity,
      eventDetails: PrivateEventDetailsSnapshot.fromResponse(rawEventDetails),
      eventPreferences: data['eventPreferences'] == null
          ? null
          : PrivateEventPreferencesSnapshot.fromResponse(
              data['eventPreferences'],
            ),
    );
  }
}

/// Callable timestamps are serialized maps; journals preserve that wire shape.
UploadedPhoto privateEventPhotoFromJson(Map<String, dynamic> json) {
  DateTime timestamp(Map<dynamic, dynamic> value) {
    final seconds = value['_seconds'];
    final nanos = value['_nanoseconds'];
    if (seconds is! int || nanos is! int || nanos < 0 || nanos >= 1000000000) {
      throw const FormatException('Invalid event photo timestamp');
    }
    return DateTime.fromMicrosecondsSinceEpoch(
      seconds * 1000000 + nanos ~/ 1000,
    );
  }

  return UploadedPhoto.fromJson({
    ...json,
    'createdAt': json['createdAt'] is Map
        ? timestamp(json['createdAt'] as Map)
        : json['createdAt'],
    'updatedAt': json['updatedAt'] is Map
        ? timestamp(json['updatedAt'] as Map)
        : json['updatedAt'],
  });
}
