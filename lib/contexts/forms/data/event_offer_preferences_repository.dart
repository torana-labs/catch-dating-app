import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:collection/collection.dart';

final _offerPreferenceId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');
final _offerPreferenceRequestId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$');
final _offerPreferenceHash = RegExp(r'^[a-f0-9]{64}$');

/// Manager read for an active legacy or progressive event. This uses the
/// event source revision, not private setupRevision, as its update fence.
class EventOfferConfiguration {
  const EventOfferConfiguration({
    required this.organizerId,
    required this.eventId,
    required this.eventSourceRevision,
    required this.startsAtMillis,
    required this.nowMillis,
    required this.suggestedExpiresAtMillis,
    required this.preferencesRevision,
    required this.preferences,
  });

  final String organizerId;
  final String eventId;
  final int eventSourceRevision;
  final int startsAtMillis;
  final int nowMillis;
  final int? suggestedExpiresAtMillis;
  final int preferencesRevision;
  final PrivateEventPreferencesSnapshot? preferences;

  factory EventOfferConfiguration.fromResponse(Object? response) {
    if (response is! Map) throw const FormatException('Invalid offer settings');
    final data = Map<String, Object?>.from(response);
    final organizerId = data['organizerId'];
    final eventId = data['eventId'];
    final sourceRevision = data['eventSourceRevision'];
    final startsAt = data['startsAtMillis'];
    final now = data['nowMillis'];
    final expiry = data['suggestedExpiresAtMillis'];
    final preferencesRevision = data['preferencesRevision'];
    final preferences = data['preferences'];
    final terms = data['paymentTerms'];
    if (data.length != 9 ||
        data.keys.toSet().difference({
          'organizerId',
          'eventId',
          'eventSourceRevision',
          'startsAtMillis',
          'nowMillis',
          'suggestedExpiresAtMillis',
          'preferencesRevision',
          'preferences',
          'paymentTerms',
        }).isNotEmpty ||
        organizerId is! String ||
        !_offerPreferenceId.hasMatch(organizerId) ||
        eventId is! String ||
        !_offerPreferenceId.hasMatch(eventId) ||
        sourceRevision is! int ||
        sourceRevision < 1 ||
        startsAt is! int ||
        startsAt < 1 ||
        now is! int ||
        now < 0 ||
        (expiry != null && (expiry is! int || expiry < 1)) ||
        preferencesRevision is! int ||
        preferencesRevision < 0 ||
        preferencesRevision > 1000000000 ||
        (preferences == null) != (terms == null) ||
        (preferences == null) != (preferencesRevision == 0)) {
      throw const FormatException('Invalid offer settings');
    }
    final snapshot = preferences == null
        ? null
        : PrivateEventPreferencesSnapshot.fromResponse({
            'revision': preferencesRevision,
            'preferences': preferences,
            'paymentTerms': terms,
          });
    return EventOfferConfiguration(
      organizerId: organizerId,
      eventId: eventId,
      eventSourceRevision: sourceRevision,
      startsAtMillis: startsAt,
      nowMillis: now,
      suggestedExpiresAtMillis: expiry as int?,
      preferencesRevision: preferencesRevision,
      preferences: snapshot,
    );
  }
}

class EventOfferPreferencesUpdateRequest {
  const EventOfferPreferencesUpdateRequest({
    required this.organizerId,
    required this.eventId,
    required this.requestId,
    required this.expectedEventSourceRevision,
    required this.expectedPreferencesRevision,
    required this.reviewedDefaultsHash,
    required this.intents,
    this.expectedActorUid,
  });

  final String? expectedActorUid;
  final String organizerId;
  final String eventId;
  final String requestId;
  final int expectedEventSourceRevision;
  final int expectedPreferencesRevision;
  final String reviewedDefaultsHash;
  final PrivateEventPreferenceIntents intents;

  bool get isValid =>
      (expectedActorUid == null ||
          _offerPreferenceId.hasMatch(expectedActorUid!)) &&
      _offerPreferenceId.hasMatch(organizerId) &&
      _offerPreferenceId.hasMatch(eventId) &&
      _offerPreferenceRequestId.hasMatch(requestId) &&
      expectedEventSourceRevision >= 1 &&
      expectedEventSourceRevision <= 9007199254740991 &&
      expectedPreferencesRevision >= 0 &&
      expectedPreferencesRevision <= 1000000000 &&
      _offerPreferenceHash.hasMatch(reviewedDefaultsHash) &&
      intents.isValid;

  Map<String, Object?> toJson() => {
    if (expectedActorUid != null) 'expectedActorUid': expectedActorUid,
    'organizerId': organizerId,
    'eventId': eventId,
    'requestId': requestId,
    'expectedEventSourceRevision': expectedEventSourceRevision,
    'expectedPreferencesRevision': expectedPreferencesRevision,
    'reviewedDefaultsHash': reviewedDefaultsHash,
    'intents': intents.toJson(),
  };

  factory EventOfferPreferencesUpdateRequest.fromJson(
    Map<String, dynamic> json,
  ) {
    if ((json.length != 7 && json.length != 8) ||
        json.keys.toSet().difference({
          'expectedActorUid',
          'organizerId',
          'eventId',
          'requestId',
          'expectedEventSourceRevision',
          'expectedPreferencesRevision',
          'reviewedDefaultsHash',
          'intents',
        }).isNotEmpty ||
        json['intents'] is! Map) {
      throw const FormatException('Invalid offer settings command');
    }
    final request = EventOfferPreferencesUpdateRequest(
      expectedActorUid: json['expectedActorUid'] as String?,
      organizerId: json['organizerId'] as String,
      eventId: json['eventId'] as String,
      requestId: json['requestId'] as String,
      expectedEventSourceRevision: json['expectedEventSourceRevision'] as int,
      expectedPreferencesRevision: json['expectedPreferencesRevision'] as int,
      reviewedDefaultsHash: json['reviewedDefaultsHash'] as String,
      intents: PrivateEventPreferenceIntents.fromJson(
        Map<String, Object?>.from(json['intents'] as Map),
      ),
    );
    if (!request.isValid) {
      throw const FormatException('Invalid offer settings command');
    }
    return request;
  }
}

typedef PreviewEventOfferPreferences =
    Future<EventOfferPreferencesPreview> Function(
      EventOfferPreferencesUpdateRequest request,
    );

/// Server-resolved before/after values, bound to the exact reviewed request.
class EventOfferPreferencesPreview {
  const EventOfferPreferencesPreview({
    required this.request,
    required this.current,
    required this.candidate,
  });

  final EventOfferPreferencesUpdateRequest request;
  final PrivateEventPreferencesSnapshot? current;
  final PrivateEventPreferencesSnapshot candidate;

  factory EventOfferPreferencesPreview.fromResponse(
    Object? response,
    EventOfferPreferencesUpdateRequest request,
  ) {
    if (response is! Map ||
        response.length != 7 ||
        response['organizerId'] != request.organizerId ||
        response['eventId'] != request.eventId ||
        response['requestId'] != request.requestId ||
        response['eventSourceRevision'] !=
            request.expectedEventSourceRevision ||
        response['existingOffersKeepOriginalTerms'] != true) {
      throw const FormatException('Invalid event preference preview');
    }
    final current = response['current'] == null
        ? null
        : PrivateEventPreferencesSnapshot.fromResponse(response['current']);
    final candidate = PrivateEventPreferencesSnapshot.fromResponse(
      response['candidate'],
    );
    if ((current?.revision ?? 0) != request.expectedPreferencesRevision ||
        candidate.revision != request.expectedPreferencesRevision + 1 ||
        candidate.paymentTerms['sourceDefaultsHash'] !=
            request.reviewedDefaultsHash ||
        !const DeepCollectionEquality().equals(
          candidate.intents.toJson(),
          request.intents.toJson(),
        )) {
      throw const FormatException('Event preference preview changed revision');
    }
    return EventOfferPreferencesPreview(
      request: request,
      current: current,
      candidate: candidate,
    );
  }
}

class EventOfferPreferencesReceipt {
  const EventOfferPreferencesReceipt({
    required this.eventId,
    required this.preferencesRevision,
    required this.replayed,
  });

  final String eventId;
  final int preferencesRevision;
  final bool replayed;

  factory EventOfferPreferencesReceipt.fromResponse(Object? response) {
    if (response is! Map) throw const FormatException('Invalid offer receipt');
    final data = Map<String, Object?>.from(response);
    if (data.length != 3 ||
        data['eventId'] is! String ||
        data['preferencesRevision'] is! int ||
        (data['preferencesRevision'] as int) < 1 ||
        data['replayed'] is! bool) {
      throw const FormatException('Invalid offer receipt');
    }
    return EventOfferPreferencesReceipt(
      eventId: data['eventId'] as String,
      preferencesRevision: data['preferencesRevision'] as int,
      replayed: data['replayed'] as bool,
    );
  }
}

class EventOfferPreferencesRepository {
  const EventOfferPreferencesRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<EventOfferConfiguration> get({
    required String organizerId,
    required String eventId,
  }) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventOfferConfiguration')
          .call<Object?>({'organizerId': organizerId, 'eventId': eventId});
      final result = EventOfferConfiguration.fromResponse(response.data);
      if (result.organizerId != organizerId || result.eventId != eventId) {
        throw const FormatException('Offer settings identity changed');
      }
      return result;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'read event offer configuration',
      resource: 'getEventOfferConfiguration',
    ),
  );

  Future<EventOfferPreferencesPreview> preview(
    EventOfferPreferencesUpdateRequest request,
  ) {
    if (!request.isValid) throw ArgumentError.value(request, 'request');
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('previewEventOfferPreferences')
            .call<Object?>(request.toJson());
        return EventOfferPreferencesPreview.fromResponse(
          response.data,
          request,
        );
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'preview event offer preferences',
        resource: 'previewEventOfferPreferences',
      ),
    );
  }

  Future<EventOfferPreferencesReceipt> configure(
    EventOfferPreferencesUpdateRequest request,
  ) {
    if (!request.isValid) throw ArgumentError.value(request, 'request');
    return withBackendErrorContext(
      () async {
        final response = await _functions
            .httpsCallable('configureEventOfferPreferences')
            .call<Object?>(request.toJson());
        final receipt = EventOfferPreferencesReceipt.fromResponse(
          response.data,
        );
        if (receipt.eventId != request.eventId ||
            receipt.preferencesRevision <=
                request.expectedPreferencesRevision) {
          throw const FormatException('Offer receipt changed event identity');
        }
        return receipt;
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'configure event offer preferences',
        resource: 'configureEventOfferPreferences',
      ),
    );
  }
}

/// Only this server marker proves that the exact request did not commit.
/// Generic aborted/permission/transport failures remain uncertain.
bool isDefinitiveEventPreferenceRejection(
  Object error, {
  required String requestId,
  required String eventId,
  required String organizerId,
}) {
  final details = backendCallableErrorDetails(error, code: 'aborted');
  return details != null &&
      details['reason'] == 'event-preferences-review-stale' &&
      details['requestId'] == requestId &&
      details['eventId'] == eventId &&
      details['organizerId'] == organizerId;
}
