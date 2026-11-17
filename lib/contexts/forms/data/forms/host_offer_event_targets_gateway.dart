import 'dart:convert';

import 'package:catch_dating_app/contexts/forms/data/event_offer_configuration_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

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
    if (eventId is! String ||
        eventId.isEmpty ||
        name != null && name is! String ||
        start is! int ||
        start <= 0 ||
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
    if (raw is! Map ||
        raw['events'] is! List ||
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
      List.unmodifiable(parsed),
      raw['nextCursor'] as String?,
    );
  }

  final List<HostOfferEventTarget> events;
  final String? nextCursor;
}

/// Current manager review of one target. A null suggested expiry means the
/// event payment setup is incomplete; the client cannot invent an amount or
/// validity period. The offer preview still rechecks this snapshot.
/// [serverNow] is the app clock when the listener delivered it.
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
    if (organizerId is! String ||
        organizerId.isEmpty ||
        eventId is! String ||
        eventId.isEmpty ||
        revision is! int ||
        revision < 1 ||
        starts is! int ||
        starts <= 0 ||
        now is! int ||
        now < 0 ||
        terms != null && terms is! Map ||
        expiry != null &&
            (expiry is! int || expiry <= now || expiry > starts)) {
      throw const FormatException('Invalid offer setup.');
    }
    return HostOfferEventConfiguration(
      organizerId: organizerId,
      eventId: eventId,
      eventSourceRevision: revision,
      startsAt: DateTime.fromMillisecondsSinceEpoch(starts),
      serverNow: DateTime.fromMillisecondsSinceEpoch(now),
      paymentTerms: terms == null
          ? null
          : Map.unmodifiable((terms as Map).cast<String, Object?>()),
      suggestedExpiresAt: expiry == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(expiry as int),
    );
  }

  /// The picker's review shape of the offer settings listener's value.
  factory HostOfferEventConfiguration.fromConfiguration(
    EventOfferConfiguration configuration,
  ) => HostOfferEventConfiguration.fromCallableData({
    'organizerId': configuration.organizerId,
    'eventId': configuration.eventId,
    'eventSourceRevision': configuration.eventSourceRevision,
    'startsAtMillis': configuration.startsAtMillis,
    'nowMillis': configuration.nowMillis,
    'paymentTerms': configuration.preferences?.paymentTerms,
    'suggestedExpiresAtMillis': configuration.suggestedExpiresAtMillis,
  });

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

/// The offer picker's events, read from Firestore under rules: published
/// events from `events` and unpublished ones from the `hostEventSummaries`
/// read model, merged soonest first. A page reads the server and falls back
/// to what this device last read when offline.
class FirestoreHostOfferEventTargetsGateway
    implements HostOfferEventTargetsGateway {
  const FirestoreHostOfferEventTargetsGateway(
    this._db, {
    required this.configurations,
    this.clock = const AppClock(),
  });

  /// Events one page holds.
  static const pageSize = 50;

  final FirebaseFirestore _db;

  /// The offer settings listeners [configuration] reads through.
  final EventOfferConfigurationReads configurations;
  final AppClock clock;

  @override
  Future<HostOfferEventTargetPage> list({
    required String organizerId,
    String? cursor,
  }) async {
    final after = cursor == null
        ? null
        : _TargetCursor.decode(cursor, organizerId);
    final asOf = after?.asOfMillis ?? clock.now().millisecondsSinceEpoch;
    final pages = await Future.wait([
      _published(organizerId, asOf, after),
      _unpublished(organizerId, asOf, after),
    ]);
    final merged = [...pages[0], ...pages[1]]
      ..sort((a, b) {
        final byStart = a.startTime.compareTo(b.startTime);
        return byStart != 0 ? byStart : a.eventId.compareTo(b.eventId);
      });
    final events = merged.take(pageSize).toList();
    final last = events.isEmpty ? null : events.last;
    return HostOfferEventTargetPage(
      List.unmodifiable(events),
      merged.length > pageSize && last != null
          ? _TargetCursor(
              organizerId: organizerId,
              asOfMillis: asOf,
              lastStartMillis: last.startTime.millisecondsSinceEpoch,
              lastEventId: last.eventId,
            ).encode()
          : null,
    );
  }

  static const _publishedContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'list event offer targets',
    resource: 'events',
  );
  static const _unpublishedContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'list event offer targets',
    resource: 'hostEventSummaries',
  );

  Future<List<HostOfferEventTarget>> _published(
    String organizerId,
    int asOf,
    _TargetCursor? after,
  ) async {
    // firestore-index: events (organizerId:ASCENDING,publicationState:ASCENDING,status:ASCENDING,startTime:ASCENDING,__name__:ASCENDING)
    var query = _db
        .collection('events')
        .where('organizerId', isEqualTo: organizerId)
        .where('publicationState', isEqualTo: 'published')
        .where('status', isEqualTo: 'active')
        .where(
          'startTime',
          isGreaterThanOrEqualTo: Timestamp.fromMillisecondsSinceEpoch(asOf),
        )
        .orderBy('startTime')
        .orderBy(FieldPath.documentId);
    if (after != null) {
      query = query.startAfter([
        Timestamp.fromMillisecondsSinceEpoch(after.lastStartMillis),
        after.lastEventId,
      ]);
    }
    final snapshot = await withBackendErrorContext(
      () => query.limit(pageSize + 1).get(),
      context: _publishedContext,
    );
    return [
      for (final doc in snapshot.docs)
        ?_publishedTarget(doc.id, doc.data(), organizerId),
    ];
  }

  Future<List<HostOfferEventTarget>> _unpublished(
    String organizerId,
    int asOf,
    _TargetCursor? after,
  ) async {
    // firestore-index: hostEventSummaries (organizerId:ASCENDING,status:ASCENDING,startTimeMillis:ASCENDING,__name__:ASCENDING)
    var query = _db
        .collection('hostEventSummaries')
        .where('organizerId', isEqualTo: organizerId)
        .where('status', isEqualTo: 'active')
        .where('startTimeMillis', isGreaterThanOrEqualTo: asOf)
        .orderBy('startTimeMillis')
        .orderBy(FieldPath.documentId);
    if (after != null) {
      query = query.startAfter([after.lastStartMillis, after.lastEventId]);
    }
    final snapshot = await withBackendErrorContext(
      () => query.limit(pageSize + 1).get(),
      context: _unpublishedContext,
    );
    return [
      for (final doc in snapshot.docs)
        ?_unpublishedTarget(doc.id, doc.data(), organizerId),
    ];
  }

  /// A published event as an offer target, or null when it is not one this
  /// organizer can offer (the commands recheck it anyway).
  static HostOfferEventTarget? _publishedTarget(
    String id,
    Map<String, dynamic> data,
    String organizerId,
  ) {
    final start = data['startTime'];
    final revision = data['setupRevision'];
    if (data['organizerId'] != organizerId || start is! Timestamp) return null;
    return HostOfferEventTarget(
      eventId: id,
      name: data['name'] is String ? data['name'] as String : null,
      startTime: start.toDate(),
      timezone: data['eventTimezone'] is String
          ? data['eventTimezone'] as String
          : null,
      publicationState: 'published',
      setupRevision: revision is int && revision >= 1 ? revision : null,
    );
  }

  /// An unpublished event's summary as an offer target, or null when the
  /// summary is not this organizer's current version.
  static HostOfferEventTarget? _unpublishedTarget(
    String id,
    Map<String, dynamic> data,
    String organizerId,
  ) {
    final row = data['row'];
    if (data['organizerId'] != organizerId ||
        data['version'] != 1 ||
        row is! Map) {
      return null;
    }
    final name = row['name'];
    final start = row['startTimeMillis'];
    final timezone = row['timezone'];
    final revision = row['setupRevision'];
    if (start is! int || revision is! int || revision < 1) return null;
    return HostOfferEventTarget(
      eventId: id,
      name: name is String ? name : null,
      startTime: DateTime.fromMillisecondsSinceEpoch(start),
      timezone: timezone is String ? timezone : null,
      publicationState: 'private',
      setupRevision: revision,
    );
  }

  /// The first value the offer settings listeners deliver.
  @override
  Future<HostOfferEventConfiguration> configuration({
    required String organizerId,
    required String eventId,
  }) async => HostOfferEventConfiguration.fromConfiguration(
    await configurations
        .watch(organizerId: organizerId, eventId: eventId)
        .first,
  );
}

/// Where the next picker page starts. It never authorizes anything; rules
/// reauthorize every read.
class _TargetCursor {
  const _TargetCursor({
    required this.organizerId,
    required this.asOfMillis,
    required this.lastStartMillis,
    required this.lastEventId,
  });

  static _TargetCursor decode(String raw, String organizerId) {
    final Object? data;
    try {
      data = jsonDecode(utf8.decode(base64Url.decode(raw)));
    } on FormatException {
      throw const FormatException('Invalid event target cursor.');
    }
    if (data is! List ||
        data.length != 4 ||
        data[0] != organizerId ||
        data[1] is! int ||
        data[2] is! int ||
        data[3] is! String) {
      throw const FormatException('Invalid event target cursor.');
    }
    return _TargetCursor(
      organizerId: organizerId,
      asOfMillis: data[1] as int,
      lastStartMillis: data[2] as int,
      lastEventId: data[3] as String,
    );
  }

  final String organizerId;
  final int asOfMillis;
  final int lastStartMillis;
  final String lastEventId;

  String encode() => base64Url.encode(
    utf8.encode(
      jsonEncode([organizerId, asOfMillis, lastStartMillis, lastEventId]),
    ),
  );
}
