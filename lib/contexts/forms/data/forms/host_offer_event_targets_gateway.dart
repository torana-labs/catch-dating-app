import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';

/// A manager-only offer target. This is a picker projection, never authority
/// to issue an offer; preview and commit recheck the current event and terms.
class HostOfferEventTarget {
  const HostOfferEventTarget({
    required this.eventId,
    required this.name,
    required this.startTime,
    required this.timezone,
    required this.publicationState,
    required this.setupRevision,
  });

  factory HostOfferEventTarget.fromMap(Object? raw) {
    if (raw is! Map) throw const FormatException('Invalid offer event.');
    final map = raw.cast<Object?, Object?>();
    final eventId = map['eventId'];
    final name = map['name'];
    final start = map['startTimeMillis'];
    final timezone = map['timezone'];
    final publication = map['publicationState'];
    final revision = map['setupRevision'];
    if (eventId is! String || eventId.isEmpty ||
        name != null && name is! String ||
        start is! int || start <= 0 ||
        timezone != null && timezone is! String ||
        publication != 'private' && publication != 'published' ||
        revision != null && (revision is! int || revision < 1)) {
      throw const FormatException('Invalid offer event.');
    }
    return HostOfferEventTarget(
      eventId: eventId,
      name: name as String?,
      startTime: DateTime.fromMillisecondsSinceEpoch(start),
      timezone: timezone as String?,
      publicationState: publication as String,
      setupRevision: revision as int?,
    );
  }

  final String eventId;
  final String? name;
  final DateTime startTime;
  final String? timezone;
  final String publicationState;
  final int? setupRevision;
}

class HostOfferEventTargetPage {
  const HostOfferEventTargetPage(this.events, this.nextCursor);

  factory HostOfferEventTargetPage.fromCallableData(Object? raw) {
    if (raw is! Map || raw['events'] is! List ||
        raw['nextCursor'] != null && raw['nextCursor'] is! String) {
      throw const FormatException('Invalid offer event page.');
    }
    final events = raw['events']! as List;
    if (events.length > 50) {
      throw const FormatException('Offer event page is oversized.');
    }
    final parsed = events.map(HostOfferEventTarget.fromMap).toList();
    if (parsed.map((event) => event.eventId).toSet().length != parsed.length) {
      throw const FormatException('Offer event page repeats an event.');
    }
    return HostOfferEventTargetPage(
      List.unmodifiable(parsed), raw['nextCursor'] as String?);
  }

  final List<HostOfferEventTarget> events;
  final String? nextCursor;
}

/// Current manager review of one target. A null suggested expiry means the
/// event payment setup is incomplete; the client cannot invent an amount or
/// validity period. The offer preview still rechecks this snapshot.
class HostOfferEventConfiguration {
  const HostOfferEventConfiguration({
    required this.organizerId,
    required this.eventId,
    required this.eventSourceRevision,
    required this.startsAt,
    required this.serverNow,
    required this.paymentTerms,
    required this.suggestedExpiresAt,
  });

  factory HostOfferEventConfiguration.fromCallableData(Object? raw) {
    if (raw is! Map) throw const FormatException('Invalid offer setup.');
    final map = raw.cast<Object?, Object?>();
    final organizerId = map['organizerId'];
    final eventId = map['eventId'];
    final revision = map['eventSourceRevision'];
    final starts = map['startsAtMillis'];
    final now = map['nowMillis'];
    final terms = map['paymentTerms'];
    final expiry = map['suggestedExpiresAtMillis'];
    if (organizerId is! String || organizerId.isEmpty ||
        eventId is! String || eventId.isEmpty ||
        revision is! int || revision < 1 ||
        starts is! int || starts <= 0 || now is! int || now < 0 ||
        terms != null && terms is! Map ||
        expiry != null && (expiry is! int || expiry <= now || expiry > starts)) {
      throw const FormatException('Invalid offer setup.');
    }
    return HostOfferEventConfiguration(
      organizerId: organizerId,
      eventId: eventId,
      eventSourceRevision: revision,
      startsAt: DateTime.fromMillisecondsSinceEpoch(starts),
      serverNow: DateTime.fromMillisecondsSinceEpoch(now),
      paymentTerms: terms == null ? null : Map.unmodifiable(
        (terms as Map).cast<String, Object?>()),
      suggestedExpiresAt: expiry == null ? null :
        DateTime.fromMillisecondsSinceEpoch(expiry as int),
    );
  }

  final String organizerId;
  final String eventId;
  final int eventSourceRevision;
  final DateTime startsAt;
  final DateTime serverNow;
  final Map<String, Object?>? paymentTerms;
  final DateTime? suggestedExpiresAt;
}

abstract interface class HostOfferEventTargetsGateway {
  Future<HostOfferEventTargetPage> list({
    required String organizerId,
    String? cursor,
  });
  Future<HostOfferEventConfiguration> configuration({
    required String organizerId,
    required String eventId,
  });
}

class CallableHostOfferEventTargetsGateway
    implements HostOfferEventTargetsGateway {
  const CallableHostOfferEventTargetsGateway(this.functions);

  final FirebaseFunctions functions;

  @override
  Future<HostOfferEventTargetPage> list({
    required String organizerId,
    String? cursor,
  }) => withBackendErrorContext(
    () async => HostOfferEventTargetPage.fromCallableData(
      (await functions.httpsCallable('listOfferEventTargets').call<Object?>({
        'organizerId': organizerId,
        'limit': 50,
        'cursor': ?cursor,
      })).data,
    ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'list event offer targets',
      resource: 'events',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );

  @override
  Future<HostOfferEventConfiguration> configuration({
    required String organizerId,
    required String eventId,
  }) => withBackendErrorContext(
    () async => HostOfferEventConfiguration.fromCallableData(
      (await functions.httpsCallable('getEventOfferConfiguration')
          .call<Object?>({'organizerId': organizerId, 'eventId': eventId}))
          .data,
    ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'review event offer configuration',
      resource: 'events',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}
