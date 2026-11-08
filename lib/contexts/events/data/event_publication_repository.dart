import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_publication_repository.g.dart';

/// One `setEventPublication` command. The optional settings travel with it;
/// sending the current [publicationState] with a changed setting saves only
/// the setting.
class EventPublicationRequest {
  const EventPublicationRequest({
    required this.organizerId,
    required this.eventId,
    required this.requestId,
    required this.expectedSetupRevision,
    required this.publicationState,
    this.listing,
    this.showGuestList,
    this.priceHiddenUntilBookingOpens,
    this.bookingMode,
  });
  final String organizerId;
  final String eventId;
  final String requestId;
  final int expectedSetupRevision;
  final String publicationState;

  /// `listed` or `link`; null leaves it as it is.
  final String? listing;
  final bool? showGuestList;
  final bool? priceHiddenUntilBookingOpens;

  /// Who can book a published event: `anyone`, `followersFirst` or
  /// `askFirst`; null leaves it as it is.
  final String? bookingMode;

  static const _settingKeys = {
    'listing',
    'showGuestList',
    'priceHiddenUntilBookingOpens',
    'bookingMode',
  };

  bool get isValid =>
      RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$').hasMatch(organizerId) &&
      RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$').hasMatch(eventId) &&
      RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$').hasMatch(requestId) &&
      expectedSetupRevision >= 1 &&
      expectedSetupRevision < 1000000000 &&
      const {'private', 'published'}.contains(publicationState) &&
      (listing == null || const {'listed', 'link'}.contains(listing)) &&
      (bookingMode == null ||
          const {'anyone', 'followersFirst', 'askFirst'}.contains(bookingMode));
  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'requestId': requestId,
    'expectedSetupRevision': expectedSetupRevision,
    'publicationState': publicationState,
    if (listing != null) 'listing': listing,
    if (showGuestList != null) 'showGuestList': showGuestList,
    if (priceHiddenUntilBookingOpens != null)
      'priceHiddenUntilBookingOpens': priceHiddenUntilBookingOpens,
    if (bookingMode != null) 'bookingMode': bookingMode,
  };
  factory EventPublicationRequest.fromJson(Map<String, dynamic> raw) {
    final settings = raw.keys.where(_settingKeys.contains).length;
    if (raw.length != 5 + settings ||
        raw['organizerId'] is! String ||
        raw['eventId'] is! String ||
        raw['requestId'] is! String ||
        raw['expectedSetupRevision'] is! int ||
        raw['publicationState'] is! String ||
        (raw['listing'] != null && raw['listing'] is! String) ||
        (raw['showGuestList'] != null && raw['showGuestList'] is! bool) ||
        (raw['priceHiddenUntilBookingOpens'] != null &&
            raw['priceHiddenUntilBookingOpens'] is! bool) ||
        (raw['bookingMode'] != null && raw['bookingMode'] is! String)) {
      throw const FormatException('Invalid publication request');
    }
    final request = EventPublicationRequest(
      organizerId: raw['organizerId'] as String,
      eventId: raw['eventId'] as String,
      requestId: raw['requestId'] as String,
      expectedSetupRevision: raw['expectedSetupRevision'] as int,
      publicationState: raw['publicationState'] as String,
      listing: raw['listing'] as String?,
      showGuestList: raw['showGuestList'] as bool?,
      priceHiddenUntilBookingOpens:
          raw['priceHiddenUntilBookingOpens'] as bool?,
      bookingMode: raw['bookingMode'] as String?,
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

/// The EventPublicationRepository over the app's callable functions.
@riverpod
EventPublicationRepository eventPublicationRepository(Ref ref) =>
    EventPublicationRepository(ref.watch(firebaseFunctionsProvider));
