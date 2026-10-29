import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';

class EventPublicationRequest {
  const EventPublicationRequest({
    required this.organizerId,
    required this.eventId,
    required this.requestId,
    required this.expectedSetupRevision,
    required this.publicationState,
  });
  final String organizerId;
  final String eventId;
  final String requestId;
  final int expectedSetupRevision;
  final String publicationState;
  bool get isValid =>
      RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$').hasMatch(organizerId) &&
      RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$').hasMatch(eventId) &&
      RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$').hasMatch(requestId) &&
      expectedSetupRevision >= 1 &&
      expectedSetupRevision < 1000000000 &&
      const {'private', 'published'}.contains(publicationState);
  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'requestId': requestId,
    'expectedSetupRevision': expectedSetupRevision,
    'publicationState': publicationState,
  };
  factory EventPublicationRequest.fromJson(Map<String, dynamic> raw) {
    if (raw.length != 5 ||
        raw['organizerId'] is! String ||
        raw['eventId'] is! String ||
        raw['requestId'] is! String ||
        raw['expectedSetupRevision'] is! int ||
        raw['publicationState'] is! String) {
      throw const FormatException('Invalid publication request');
    }
    final request = EventPublicationRequest(
      organizerId: raw['organizerId'] as String,
      eventId: raw['eventId'] as String,
      requestId: raw['requestId'] as String,
      expectedSetupRevision: raw['expectedSetupRevision'] as int,
      publicationState: raw['publicationState'] as String,
    );
    if (!request.isValid) {
      throw const FormatException('Invalid publication request');
    }
    return request;
  }
}

class EventPublicationReceipt {
  const EventPublicationReceipt({
    required this.eventId,
    required this.setupRevision,
    required this.publicationState,
    required this.replayed,
  });
  final String eventId;
  final int setupRevision;
  final String publicationState;
  final bool replayed;
  factory EventPublicationReceipt.fromResponse(Object? raw) {
    if (raw is! Map ||
        raw.length != 4 ||
        raw['eventId'] is! String ||
        (raw['eventId'] as String).isEmpty ||
        raw['setupRevision'] is! int ||
        (raw['setupRevision'] as int) < 1 ||
        raw['replayed'] is! bool ||
        !const {'private', 'published'}.contains(raw['publicationState'])) {
      throw const FormatException('Invalid publication receipt');
    }
    return EventPublicationReceipt(
      eventId: raw['eventId'] as String,
      setupRevision: raw['setupRevision'] as int,
      publicationState: raw['publicationState'] as String,
      replayed: raw['replayed'] as bool,
    );
  }
}

class EventPublicationRepository {
  const EventPublicationRepository(this._functions);
  final FirebaseFunctions _functions;
  Future<EventPublicationReceipt> set(EventPublicationRequest request) {
    if (!request.isValid) throw ArgumentError.value(request, 'request');
    return withBackendErrorContext(
      () async {
        final result = await _functions
            .httpsCallable('setEventPublication')
            .call<Object?>(request.toJson());
        return EventPublicationReceipt.fromResponse(result.data);
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'set event publication',
        resource: 'setEventPublication',
      ),
    );
  }
}

/// A generic error cannot release an uncertain command. Only this exact
/// revision rejection is issued after the server established no prior receipt.
bool isDefinitivePublicationRejection(
  Object error,
  EventPublicationRequest request,
) {
  Object? cause = error;
  for (var depth = 0; depth < 8 && cause is AppException; depth++) {
    cause = cause.cause;
  }
  if (cause is! FirebaseFunctionsException || cause.code != 'aborted') {
    return false;
  }
  final details = cause.details;
  return details is Map &&
      details['reason'] == 'event-publication-review-stale' &&
      details['requestId'] == request.requestId &&
      details['eventId'] == request.eventId &&
      details['organizerId'] == request.organizerId &&
      details['expectedSetupRevision'] == request.expectedSetupRevision &&
      details['publicationState'] == request.publicationState;
}
