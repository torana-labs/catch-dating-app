import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_content_validation.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/core/schema_contracts/field_value_validation.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        UpdatePrivateEventDetailsCallableRequest,
        ReconcilePrivateEventSeatsCallableRequest;
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';

bool _validDetailId(String value) => acceptsContractValue(
  CatchContractConstraints.updatePrivateEventDetailsCallablePayloadEventId,
  value,
);
final _detailRequestPattern = RegExp(
  CatchContractConstraints
      .updatePrivateEventDetailsCallablePayloadRequestId
      .pattern!,
);

/// A partial command. Missing keys leave the event field unchanged; clear is
/// explicit. Organizer suggestions are copied only by an inherit command.
class PrivateEventDetailsPatch {
  const PrivateEventDetailsPatch({
    this.durationMinutes,
    this.venue,
    this.meetingLocation,
    this.eventFormat,
    this.description,
    this.itinerary,
    this.eventPhotos,
    this.admissionTerms,
    this.distanceKm,
    this.pace,
  });

  final List<EventItineraryItem>? itinerary;
  final List<UploadedPhoto>? eventPhotos;
  final String? description;
  final PrivateEventAdmissionTerms? admissionTerms;
  final double? distanceKm;
  final String? pace;
  final EventSetupValue<int>? durationMinutes;
  final EventSetupValue<String>? venue;
  final EventMeetingLocation? meetingLocation;
  final EventSetupValue<EventFormatSnapshot>? eventFormat;

  bool get isValid {
    if (durationMinutes == null &&
        venue == null &&
        meetingLocation == null &&
        eventFormat == null &&
        description == null &&
        itinerary == null &&
        eventPhotos == null &&
        admissionTerms == null &&
        distanceKm == null &&
        pace == null) {
      return false;
    }
    if (itinerary != null && !isValidEventItinerary(itinerary!)) return false;
    if (description != null &&
            !acceptsContractValue(
              CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsDescription,
              description,
            ) ||
        admissionTerms != null && !admissionTerms!.isValid ||
        distanceKm != null &&
            !acceptsContractValue(
              CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsDistanceKm,
              distanceKm,
            ) ||
        pace != null &&
            !acceptsContractValue(
              CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsPace,
              pace,
            ) ||
        eventPhotos != null &&
            !acceptsContractValue(
              CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsEventPhotos,
              eventPhotos,
            )) {
      return false;
    }
    final duration = durationMinutes;
    if (duration?.mode == EventSetupValueMode.set &&
        !acceptsContractValue(
          CatchContractConstraints
              .updatePrivateEventDetailsCallablePayloadDetailsDurationMinutesValue,
          duration!.value,
        )) {
      return false;
    }
    if (meetingLocation != null &&
        (venue != null || !isValidEventMeetingLocation(meetingLocation!))) {
      return false;
    }
    final place = venue;
    if (place?.mode == EventSetupValueMode.set &&
        (place!.value == null ||
            place.value!.trim() != place.value ||
            !acceptsContractValue(
              CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsVenueValueName,
              place.value,
            ))) {
      return false;
    }
    final format = eventFormat;
    final label = format?.value?.customActivityLabel;
    if (label != null &&
        (label.trim().isEmpty ||
            !acceptsContractValue(
              CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsEventFormatValueCustomActivityLabel,
              label,
            ))) {
      return false;
    }
    if (format?.mode == EventSetupValueMode.inherit ||
        (format?.mode == EventSetupValueMode.set &&
            (format!.value == null || format.value!.version != 1))) {
      return false;
    }
    return true;
  }

  Map<String, Object?> toJson() => {
    if (description != null) 'description': description,
    if (itinerary != null)
      'itinerary': itinerary!.map((item) => item.toJson()).toList(),
    if (eventPhotos != null)
      'eventPhotos': eventPhotos!
          .map(
            (photo) => {
              ...photo.toJson(),
              'createdAt': {
                '_seconds': photo.createdAt.millisecondsSinceEpoch ~/ 1000,
                '_nanoseconds':
                    (photo.createdAt.microsecondsSinceEpoch % 1000000) * 1000,
              },
              'updatedAt': {
                '_seconds': photo.updatedAt.millisecondsSinceEpoch ~/ 1000,
                '_nanoseconds':
                    (photo.updatedAt.microsecondsSinceEpoch % 1000000) * 1000,
              },
            },
          )
          .toList(),
    if (admissionTerms != null) 'admissionTerms': admissionTerms!.toJson(),
    if (distanceKm != null) 'distanceKm': distanceKm,
    if (pace != null) 'pace': pace,
    if (durationMinutes != null)
      'durationMinutes': durationMinutes!.toJson((value) => value),
    if (venue != null) 'venue': venue!.toJson((value) => {'name': value}),
    if (meetingLocation != null)
      'venue': {'mode': 'set', 'value': meetingLocation!.normalized().toJson()},
    if (eventFormat != null)
      'eventFormat': eventFormat!.toJson((value) => value.toJson()),
  };

  factory PrivateEventDetailsPatch.fromJson(Map<String, Object?> json) {
    if (json.keys.toSet().difference({
      'durationMinutes',
      'venue',
      'eventFormat',
      'description',
      'itinerary',
      'eventPhotos',
      'admissionTerms',
      'distanceKm',
      'pace',
    }).isNotEmpty) {
      throw const FormatException('Unknown private event detail');
    }
    EventSetupValue<T> parse<T>(
      Object? raw,
      T Function(Object?) decode, {
      bool allowInherit = true,
    }) {
      if (raw is! Map) throw const FormatException('Invalid detail intent');
      final intent = Map<String, Object?>.from(raw);
      if (intent.length == 1 && intent['mode'] == 'clear') {
        return const EventSetupValue.clear();
      }
      if (allowInherit && intent.length == 1 && intent['mode'] == 'inherit') {
        return const EventSetupValue.inherit();
      }
      if (intent.length == 2 &&
          intent['mode'] == 'set' &&
          intent.containsKey('value')) {
        return EventSetupValue.set(decode(intent['value']));
      }
      throw const FormatException('Invalid detail intent');
    }

    final rawVenue = json['venue'];
    final rawLocation = rawVenue is Map ? rawVenue['value'] : null;
    final hasLocation =
        rawLocation is Map &&
        (rawLocation.containsKey('latitude') ||
            rawLocation.containsKey('longitude'));
    final patch = PrivateEventDetailsPatch(
      description: json['description'] as String?,
      itinerary: json['itinerary'] == null
          ? null
          : (json['itinerary'] as List)
                .map(
                  (item) => EventItineraryItem.fromJson(
                    Map<String, dynamic>.from(item as Map),
                  ),
                )
                .toList(),
      eventPhotos: json['eventPhotos'] == null
          ? null
          : (json['eventPhotos'] as List)
                .map(
                  (item) => privateEventPhotoFromJson(
                    Map<String, dynamic>.from(item as Map),
                  ),
                )
                .toList(),
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      pace: json['pace'] as String?,
      admissionTerms: json['admissionTerms'] == null
          ? null
          : PrivateEventAdmissionTerms.fromResponse(json['admissionTerms']),
      meetingLocation: hasLocation
          ? parse<EventMeetingLocation>(rawVenue, (raw) {
              if (raw is! Map ||
                  raw.keys.toSet().difference({
                    'name',
                    'address',
                    'placeId',
                    'latitude',
                    'longitude',
                    'notes',
                  }).isNotEmpty) {
                throw const FormatException('Invalid meeting location');
              }
              return EventMeetingLocation.fromJson(
                Map<String, dynamic>.from(raw),
              );
            }, allowInherit: false).value
          : null,
      durationMinutes: json.containsKey('durationMinutes')
          ? parse<int>(json['durationMinutes'], (raw) {
              if (raw is! int) throw const FormatException('Invalid duration');
              return raw;
            })
          : null,
      venue: json.containsKey('venue') && !hasLocation
          ? parse<String>(json['venue'], (raw) {
              if (raw is! Map) throw const FormatException('Invalid venue');
              final data = Map<String, Object?>.from(raw);
              if (data.length != 1 || data['name'] is! String) {
                throw const FormatException('Invalid venue');
              }
              return data['name'] as String;
            })
          : null,
      eventFormat: json.containsKey('eventFormat')
          ? parse<EventFormatSnapshot>(json['eventFormat'], (raw) {
              if (raw is! Map) throw const FormatException('Invalid format');
              final data = Map<String, Object?>.from(raw);
              if (data['version'] != 1 ||
                  !ActivityKind.values.any(
                    (v) => v.name == data['activityKind'],
                  ) ||
                  !EventInteractionModel.values.any(
                    (v) => v.name == data['interactionModel'],
                  )) {
                throw const FormatException('Invalid format');
              }
              return EventFormatSnapshot.fromJson(
                Map<String, dynamic>.from(data),
              );
            }, allowInherit: false)
          : null,
    );
    if (!patch.isValid) throw const FormatException('Invalid details patch');
    return patch;
  }
}

class PrivateEventDetailsUpdateRequest {
  const PrivateEventDetailsUpdateRequest({
    required this.organizerId,
    required this.eventId,
    required this.requestId,
    required this.expectedSetupRevision,
    required this.reviewedDefaultsHash,
    required this.details,
    this.discard = false,
  });

  final String organizerId;
  final String eventId;
  final String requestId;
  final int expectedSetupRevision;
  final String reviewedDefaultsHash;
  final PrivateEventDetailsPatch details;
  final bool discard;
  PrivateEventDetailsUpdateRequest withDiscard(bool value) =>
      PrivateEventDetailsUpdateRequest(
        organizerId: organizerId,
        eventId: eventId,
        requestId: requestId,
        expectedSetupRevision: expectedSetupRevision,
        reviewedDefaultsHash: reviewedDefaultsHash,
        details: details,
        discard: value,
      );

  bool get isValid =>
      _validDetailId(organizerId) &&
      _validDetailId(eventId) &&
      _detailRequestPattern.hasMatch(requestId) &&
      acceptsContractValue(
        CatchContractConstraints
            .updatePrivateEventDetailsCallablePayloadExpectedSetupRevision,
        expectedSetupRevision,
      ) &&
      acceptsContractValue(
        CatchContractConstraints
            .updatePrivateEventDetailsCallablePayloadReviewedDefaultsHash,
        reviewedDefaultsHash,
      ) &&
      details.isValid &&
      (!discard ||
          (details.admissionTerms != null && details.toJson().length == 1));

  Map<String, Object?> toJson() => discard
      ? ReconcilePrivateEventSeatsCallableRequest(
          organizerId: organizerId,
          eventId: eventId,
          requestId: requestId,
          expectedSetupRevision: expectedSetupRevision,
          reviewedDefaultsHash: reviewedDefaultsHash,
          details: details.toJson(),
          discard: true,
        ).toJson()
      : UpdatePrivateEventDetailsCallableRequest(
          organizerId: organizerId,
          eventId: eventId,
          requestId: requestId,
          expectedSetupRevision: expectedSetupRevision,
          reviewedDefaultsHash: reviewedDefaultsHash,
          details: details.toJson(),
        ).toJson();

  factory PrivateEventDetailsUpdateRequest.fromJson(Map<String, dynamic> json) {
    if (json.keys.toSet().difference({
          'organizerId',
          'eventId',
          'requestId',
          'expectedSetupRevision',
          'reviewedDefaultsHash',
          'details',
          'discard',
        }).isNotEmpty ||
        (json.length != 6 && json.length != 7) ||
        (json.containsKey('discard') && json['discard'] != true) ||
        json['details'] is! Map) {
      throw const FormatException('Invalid details command');
    }
    final request = PrivateEventDetailsUpdateRequest(
      organizerId: json['organizerId'] as String,
      eventId: json['eventId'] as String,
      requestId: json['requestId'] as String,
      expectedSetupRevision: json['expectedSetupRevision'] as int,
      reviewedDefaultsHash: json['reviewedDefaultsHash'] as String,
      discard: json['discard'] == true,
      details: PrivateEventDetailsPatch.fromJson(
        Map<String, Object?>.from(json['details'] as Map),
      ),
    );
    if (!request.isValid) {
      throw const FormatException('Invalid details command');
    }
    return request;
  }
}

class PrivateEventDetailsRepository {
  const PrivateEventDetailsRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<PrivateSeatReconciliationResult> reconcile(
    PrivateEventDetailsUpdateRequest request,
  ) {
    if (!request.isValid ||
        request.details.admissionTerms == null ||
        request.details.toJson().length != 1) {
      throw ArgumentError.value(request, 'request');
    }
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('reconcilePrivateEventSeats')
            .call<Object?>(request.toJson());
        final result = PrivateSeatReconciliationResult.fromResponse(
          response.data,
        );
        if ((result.receipt?.eventId ??
                result.progress?.eventId ??
                result.discardedEventId) !=
            request.eventId) {
          throw const FormatException('Guest reconciliation changed identity');
        }
        return result;
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'save admission settings and reconcile guests',
        resource: 'reconcilePrivateEventSeats',
      ),
    );
  }

  Future<PrivateEventCreateReceipt> update(
    PrivateEventDetailsUpdateRequest request,
  ) {
    if (!request.isValid) throw ArgumentError.value(request, 'request');
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('updatePrivateEventDetails')
            .call<Object?>(request.toJson());
        final receipt = PrivateEventCreateReceipt.fromResponse(response.data);
        if (receipt.eventId != request.eventId ||
            receipt.setupRevision <= request.expectedSetupRevision) {
          throw const FormatException('Details receipt changed event identity');
        }
        return receipt;
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'update private event details',
        resource: 'updatePrivateEventDetails',
      ),
    );
  }
}

class PrivateSeatReconciliationProgress {
  const PrivateSeatReconciliationProgress({
    required this.eventId,
    required this.phase,
    required this.scannedRows,
  });
  final String eventId;
  final String phase;
  final int scannedRows;
}

class PrivateSeatReconciliationResult {
  const PrivateSeatReconciliationResult.complete(
    PrivateEventCreateReceipt value,
  ) : receipt = value,
      progress = null,
      discardedEventId = null,
      discardedRequestId = null;
  const PrivateSeatReconciliationResult.pending(
    PrivateSeatReconciliationProgress value,
  ) : progress = value,
      receipt = null,
      discardedEventId = null,
      discardedRequestId = null;
  const PrivateSeatReconciliationResult.discarded(
    this.discardedEventId,
    this.discardedRequestId,
  ) : receipt = null,
      progress = null;
  final String? discardedEventId;
  final String? discardedRequestId;
  final PrivateEventCreateReceipt? receipt;
  final PrivateSeatReconciliationProgress? progress;
  factory PrivateSeatReconciliationResult.fromResponse(Object? raw) {
    if (raw is Map &&
        raw.length == 3 &&
        raw['kind'] == 'discarded' &&
        raw['eventId'] is String &&
        _validDetailId(raw['eventId'] as String) &&
        raw['requestId'] is String &&
        _detailRequestPattern.hasMatch(raw['requestId'] as String)) {
      return PrivateSeatReconciliationResult.discarded(
        raw['eventId'] as String,
        raw['requestId'] as String,
      );
    }
    if (raw is! Map || raw.length != 2) {
      throw const FormatException('Invalid guest reconciliation result');
    }
    if (raw['kind'] == 'complete' && raw.containsKey('receipt')) {
      return PrivateSeatReconciliationResult.complete(
        PrivateEventCreateReceipt.fromResponse(raw['receipt']),
      );
    }
    final progress = raw['progress'];
    bool count(Object? value, int max) =>
        value is int && value >= 0 && value <= max;
    if (raw['kind'] != 'progress' ||
        progress is! Map ||
        progress.length != 7 ||
        progress['eventId'] is! String ||
        !_validDetailId(progress['eventId'] as String) ||
        !const {
          'scan',
          'plan',
          'apply',
          'cleanup',
          'discard',
        }.contains(progress['phase']) ||
        !count(progress['migrationRevision'], 1000000000) ||
        progress['migrationRevision'] == 0 ||
        !count(progress['scannedRows'], 750) ||
        !count(progress['appliedRows'], 1500) ||
        !count(progress['outputRows'], 1500) ||
        (progress['appliedRows'] as int) > (progress['outputRows'] as int) ||
        !progress.containsKey('occupied') ||
        progress['occupied'] != null) {
      throw const FormatException('Invalid guest reconciliation progress');
    }
    return PrivateSeatReconciliationResult.pending(
      PrivateSeatReconciliationProgress(
        eventId: progress['eventId'] as String,
        phase: progress['phase'] as String,
        scannedRows: progress['scannedRows'] as int,
      ),
    );
  }
}

/// Only the exact server rejection after receipt/run checks can release an
/// uncertain command. Connectivity and later permission errors cannot.
bool isDefinitiveDetailsRejection(
  Object error,
  PrivateEventDetailsUpdateRequest request,
) => _matchesDetailsOutcome(error, request, 'aborted', {
  'event-details-review-stale',
  'event-details-discarded',
});

bool isDiscardUnavailable(
  Object error,
  PrivateEventDetailsUpdateRequest request,
) => _matchesDetailsOutcome(error, request, 'failed-precondition', {
  'seat-reconciliation-discard-unavailable',
});

bool _matchesDetailsOutcome(
  Object error,
  PrivateEventDetailsUpdateRequest request,
  String code,
  Set<String> reasons,
) {
  final details = backendCallableErrorDetails(error, code: code);
  return details != null &&
      reasons.contains(details['reason']) &&
      details['requestId'] == request.requestId &&
      details['eventId'] == request.eventId &&
      details['organizerId'] == request.organizerId &&
      details['expectedSetupRevision'] == request.expectedSetupRevision &&
      details['reviewedDefaultsHash'] == request.reviewedDefaultsHash;
}
