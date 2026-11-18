import 'dart:convert';

import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/cache/cache_policies.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/firebase/listener_first_value.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:crypto/crypto.dart';

/// How long a directory listener may wait for its first snapshot.
final _listenerFirstValue = CachePolicies.listener.firstLoad;

/// Scoped cursors never authorize access; current Firestore rules do.
class HostSummaryCursor {
  static const prefix = 'hs1.';
  static String scope(
    String actor,
    String organizerId,
    String collection,
    String queryKey,
  ) => sha256
      .convert(
        utf8.encode(jsonEncode([actor, organizerId, collection, queryKey])),
      )
      .toString();
  static String encode(String scope, Object value, String id) =>
      '$prefix${base64Url.encode(utf8.encode(jsonEncode([scope, value, id])))}';
  static List<Object?>? decode(String? cursor, String scope) {
    if (cursor == null) return null;
    if (!cursor.startsWith(prefix)) {
      throw const FormatException('The directory changed; refresh this list.');
    }
    final Object? data = jsonDecode(
      utf8.decode(base64Url.decode(cursor.substring(prefix.length))),
    );
    if (data is! List ||
        data.length != 3 ||
        data[0] != scope ||
        data[2] is! String ||
        (data[1] is! String && data[1] is! num)) {
      throw const FormatException('This cursor belongs to another list.');
    }
    return [data[1], data[2]];
  }
}

class HostSummaryPage {
  const HostSummaryPage(this.documents, this.nextCursor);
  final List<Map<String, dynamic>> documents;
  final String? nextCursor;
}

/// The first rows of one live directory query, and whether more follow.
class HostSummaryWindow {
  const HostSummaryWindow(this.documents, {required this.hasMore});
  final List<Map<String, dynamic>> documents;
  final bool hasMore;
}

/// Reads the Host directory read models. Rules reauthorize every server
/// read; offline, a read falls back to what this device last read, so the
/// lists still open. Only concurrent directory reads are shared, scoped to
/// the current account; no repository PII cache.
class HostSummaryReader {
  HostSummaryReader(
    this._firestore, {
    required this.actorId,
    AppClock clock = const AppClock(),
  }) : _clock = clock;
  final FirebaseFirestore _firestore;
  final String? Function() actorId;
  final AppClock _clock;
  final _directories = <String, Future<Map<String, dynamic>?>>{};

  String _actor() {
    final actor = actorId();
    if (actor == null) throw StateError('Sign in to load this directory.');
    return actor;
  }

  void _checkActor(String actor) {
    if (actorId() != actor) {
      throw StateError('The signed-in account changed during this read.');
    }
  }

  Future<Map<String, dynamic>?> directory(String organizerId) async {
    final actor = _actor();
    final key = '$actor/$organizerId';
    var pending = _directories[key];
    if (pending == null) {
      pending = _loadDirectory(organizerId, actor);
      _directories[key] = pending;
    }
    try {
      final data = await pending;
      _checkActor(actor);
      return data;
    } finally {
      _directories.removeWhere(
        (entryKey, value) => entryKey == key && identical(value, pending),
      );
    }
  }

  /// The organizer's directory once the read model behind [marker] is
  /// active. Every organizer starts active, so a missing marker is a server
  /// fault to retry, not a reason to read through a Function.
  Future<Map<String, dynamic>> activatedDirectory(
    String organizerId,
    String marker,
  ) async {
    final data = await directory(organizerId);
    if (data == null || data[marker] != 1) {
      throw StateError('This list is not ready yet. Try again shortly.');
    }
    return data;
  }

  /// The organizer's directory document while it is listened to, once the
  /// read model behind [marker] is active. A missing marker is a server
  /// fault to retry. A document the device has not cached yet does not read
  /// as missing offline: after the listener's first-value deadline the
  /// stream reports [listenerNothingSaved] and stays open.
  Stream<Map<String, dynamic>> watchActivatedDirectory(
    String organizerId,
    String marker,
  ) {
    _actor();
    return withBackendErrorStream(
      () => _firestore
          .collection('hostDirectorySummaries')
          .doc(organizerId)
          .snapshots()
          .where((doc) => doc.exists || !doc.metadata.isFromCache)
          .firstValueWithin(_listenerFirstValue, clock: _clock),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch Host directory readiness',
        resource: 'hostDirectorySummaries',
      ),
    ).map((doc) {
      final data = doc.data();
      if (data != null && data['organizerId'] != organizerId) {
        throw const FormatException('Directory owner does not match.');
      }
      if (data == null || data[marker] != 1) {
        throw StateError('This list is not ready yet. Try again shortly.');
      }
      return data;
    });
  }

  /// The most rows one directory window listens to: the largest exhaustive
  /// directory read (every saved group) fits in one window.
  static const maxWindow = 2500;

  /// The first [limit] rows of one directory query while it is listened to:
  /// the same filters and order as [page], as a listener that follows every
  /// change. Showing more means listening to a larger window. With a
  /// [marker], the window opens once the organizer's directory says that
  /// read model is active; a missing marker is a server fault to retry.
  Stream<HostSummaryWindow> watchWindow({
    required String collection,
    required String organizerId,
    required String orderField,
    required bool descending,
    required int limit,
    String? marker,
    Map<String, Object> equalities = const {},
    Map<String, List<String>> inFilters = const {},
    num? lowerInclusive,
    num? upperExclusive,
    String? arrayField,
    List<String> arrayValues = const [],
    String? prefix,
  }) {
    _actor();
    final boundedLimit = limit.clamp(1, maxWindow);
    final query = _ordered(
      collection: collection,
      organizerId: organizerId,
      orderField: orderField,
      descending: descending,
      equalities: equalities,
      inFilters: inFilters,
      lowerInclusive: lowerInclusive,
      upperExclusive: upperExclusive,
      arrayField: arrayField,
      arrayValues: arrayValues,
      prefix: prefix,
    ).limit(boundedLimit + 1);
    Stream<HostSummaryWindow> rows() => query.snapshots().map((snapshot) {
      final docs = snapshot.docs.take(boundedLimit);
      return HostSummaryWindow([
        for (final doc in docs)
          if (doc.data() case final value
              when value['organizerId'] == organizerId && value['version'] == 1)
            value
          else
            throw const FormatException('Unsupported directory summary.'),
      ], hasMore: snapshot.docs.length > boundedLimit);
    });
    final window = withBackendErrorStream(
      rows,
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch Host list summaries',
        resource: collection,
      ),
    );
    return _afterActivation(organizerId, marker, window);
  }

  /// One directory query read [pageSize] rows at a time, every row shown
  /// kept live: the same filters and order as [page]. Each page is its own
  /// listener (see [LivePagedQuery]), so asking for more reads only the new
  /// page, up to [maxWindow] rows. With a [marker], the first page opens once
  /// the organizer's directory says that read model is active; a missing
  /// marker is a server fault to retry.
  LivePager<Map<String, dynamic>> watchPages({
    required String collection,
    required String organizerId,
    required String orderField,
    required bool descending,
    required int pageSize,
    String? marker,
    Map<String, Object> equalities = const {},
    Map<String, List<String>> inFilters = const {},
    num? lowerInclusive,
    num? upperExclusive,
    String? arrayField,
    List<String> arrayValues = const [],
    String? prefix,
  }) {
    _actor();
    final query = _ordered(
      collection: collection,
      organizerId: organizerId,
      orderField: orderField,
      descending: descending,
      equalities: equalities,
      inFilters: inFilters,
      lowerInclusive: lowerInclusive,
      upperExclusive: upperExclusive,
      arrayField: arrayField,
      arrayValues: arrayValues,
      prefix: prefix,
    );
    return LivePagedQuery<Map<String, dynamic>, Map<String, dynamic>>(
      query: query,
      pageSize: pageSize.clamp(1, maxWindow),
      maxRows: maxWindow,
      beforeOpen: marker == null
          ? null
          : () => activatedDirectory(organizerId, marker),
      convert: (doc) => switch (doc.data()) {
        final value
            when value['organizerId'] == organizerId && value['version'] == 1 =>
          value,
        _ => throw const FormatException('Unsupported directory summary.'),
      },
      errorContext: BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch Host list summaries',
        resource: collection,
      ),
    );
  }

  Query<Map<String, dynamic>> _ordered({
    required String collection,
    required String organizerId,
    required String orderField,
    required bool descending,
    required Map<String, Object> equalities,
    required Map<String, List<String>> inFilters,
    required num? lowerInclusive,
    required num? upperExclusive,
    required String? arrayField,
    required List<String> arrayValues,
    required String? prefix,
  }) {
    Query<Map<String, dynamic>> query = _firestore
        .collection(collection)
        .where('organizerId', isEqualTo: organizerId);
    for (final entry in equalities.entries) {
      query = query.where(entry.key, isEqualTo: entry.value);
    }
    for (final entry in inFilters.entries) {
      query = query.where(entry.key, whereIn: entry.value);
    }
    if (lowerInclusive != null) {
      query = query.where(orderField, isGreaterThanOrEqualTo: lowerInclusive);
    }
    if (upperExclusive != null) {
      query = query.where(orderField, isLessThan: upperExclusive);
    }
    if (arrayField != null) {
      query = query.where(arrayField, arrayContainsAny: arrayValues);
    }
    if (prefix != null) {
      query = query
          .where(orderField, isGreaterThanOrEqualTo: prefix)
          .where(orderField, isLessThan: '$prefix\uf8ff');
    }
    return query
        .orderBy(orderField, descending: descending)
        .orderBy(FieldPath.documentId, descending: descending);
  }

  /// One directory record while it is listened to; null while it does not
  /// exist. A record the device has not cached yet does not read as missing
  /// offline: after the listener's first-value deadline the stream reports
  /// [listenerNothingSaved] and stays open.
  Stream<Map<String, dynamic>?> watchDocument({
    required String collection,
    required String organizerId,
    required String id,
    String? marker,
  }) {
    _actor();
    Stream<Map<String, dynamic>?> record() => _firestore
        .collection(collection)
        .doc(id)
        .snapshots()
        .where((doc) => doc.exists || !doc.metadata.isFromCache)
        .firstValueWithin(_listenerFirstValue, clock: _clock)
        .map((doc) {
          final data = doc.data();
          if (data != null &&
              (data['organizerId'] != organizerId || data['version'] != 1)) {
            throw const FormatException(
              'Selected record owner or version changed.',
            );
          }
          return data;
        });
    final watched = withBackendErrorStream(
      record,
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch selected Host record',
        resource: collection,
      ),
    );
    return _afterActivation(organizerId, marker, watched);
  }

  /// [stream] once the read model behind [marker] is active, or at once
  /// without one. An inactive marker fails as [activatedDirectory] does.
  Stream<T> _afterActivation<T>(
    String organizerId,
    String? marker,
    Stream<T> stream,
  ) => marker == null
      ? stream
      : Stream.fromFuture(
          activatedDirectory(organizerId, marker),
        ).asyncExpand((_) => stream);

  Future<Map<String, dynamic>?> _loadDirectory(
    String organizerId,
    String actor,
  ) async {
    final snapshot = await withBackendErrorContext(
      () => _firestore
          .collection('hostDirectorySummaries')
          .doc(organizerId)
          .get(),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'load Host directory readiness',
        resource: 'hostDirectorySummaries',
      ),
    );
    _checkActor(actor);
    final data = snapshot.data();
    if (data != null && data['organizerId'] != organizerId) {
      throw const FormatException('Directory owner does not match.');
    }
    return data;
  }

  Future<Map<String, dynamic>?> document({
    required String collection,
    required String organizerId,
    required String id,
  }) async {
    final actor = _actor();
    final snapshot = await withBackendErrorContext(
      () => _firestore.collection(collection).doc(id).get(),
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'load selected Host record',
        resource: collection,
      ),
    );
    _checkActor(actor);
    final data = snapshot.data();
    if (data != null &&
        (data['organizerId'] != organizerId || data['version'] != 1)) {
      throw const FormatException('Selected record owner or version changed.');
    }
    return data;
  }

  Future<HostSummaryPage> page({
    required String collection,
    required String organizerId,
    required String orderField,
    required bool descending,
    required String queryKey,
    required int limit,
    Map<String, Object> equalities = const {},
    Map<String, List<String>> inFilters = const {},
    num? lowerInclusive,
    num? upperExclusive,
    String? arrayField,
    List<String> arrayValues = const [],
    String? prefix,
    String? cursor,
  }) async {
    final actor = _actor();
    final scope = HostSummaryCursor.scope(
      actor,
      organizerId,
      collection,
      queryKey,
    );
    final position = HostSummaryCursor.decode(cursor, scope);
    final boundedLimit = limit.clamp(1, 100);
    var query = _ordered(
      collection: collection,
      organizerId: organizerId,
      orderField: orderField,
      descending: descending,
      equalities: equalities,
      inFilters: inFilters,
      lowerInclusive: lowerInclusive,
      upperExclusive: upperExclusive,
      arrayField: arrayField,
      arrayValues: arrayValues,
      prefix: prefix,
    );
    if (position != null) query = query.startAfter(position);
    final snapshot = await withBackendErrorContext(
      () => query.limit(boundedLimit + 1).get(),
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'load Host list summaries',
        resource: collection,
      ),
    );
    _checkActor(actor);
    final docs = snapshot.docs.take(boundedLimit).toList(growable: false);
    final data = docs
        .map((doc) {
          final value = doc.data();
          if (value['organizerId'] != organizerId || value['version'] != 1) {
            throw const FormatException('Unsupported directory summary.');
          }
          return value;
        })
        .toList(growable: false);
    final last = docs.isEmpty ? null : docs.last;
    return HostSummaryPage(
      data,
      snapshot.docs.length > boundedLimit && last != null
          ? HostSummaryCursor.encode(scope, last.get(orderField), last.id)
          : null,
    );
  }
}
