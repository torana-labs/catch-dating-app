import 'dart:convert';

import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/cache/cache_policies.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/listener_first_value.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:crypto/crypto.dart';

/// How long a read model listener may wait for its first snapshot.
final _listenerFirstValue = CachePolicies.listener.firstLoad;

/// Scoped cursors never authorize access; current Firestore rules do.
class ReadModelCursor {
  static const prefix = 'hs1.';
  static String scope(
    String actor,
    String scopeId,
    String collection,
    String queryKey,
  ) => sha256
      .convert(utf8.encode(jsonEncode([actor, scopeId, collection, queryKey])))
      .toString();
  static String encode(String scope, Object value, String id) =>
      '$prefix${base64Url.encode(utf8.encode(jsonEncode([scope, value, id])))}';
  static List<Object?>? decode(String? cursor, String scope) {
    if (cursor == null) return null;
    if (!cursor.startsWith(prefix)) {
      throw const FormatException('The list changed; refresh it.');
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

class ReadModelPage {
  const ReadModelPage(this.documents, this.nextCursor);
  final List<Map<String, dynamic>> documents;
  final String? nextCursor;
}

/// The first rows of one live read model query, and whether more follow.
class ReadModelWindow {
  const ReadModelWindow(this.documents, {required this.hasMore});
  final List<Map<String, dynamic>> documents;
  final bool hasMore;
}

/// Reads one [ReadModelFamily]: rows scoped to an owner and the owner's
/// readiness document. Rules reauthorize every server read; offline, a read
/// falls back to what this device last read, so the lists still open. Only
/// concurrent readiness reads are shared, scoped to the current account; no
/// repository PII cache.
class ScopedReadModelReader {
  ScopedReadModelReader(
    this._firestore, {
    required this.family,
    required this.actorId,
    this.clock = const AppClock(),
  });
  final FirebaseFirestore _firestore;
  final ReadModelFamily family;
  final String? Function() actorId;
  final AppClock clock;
  final _readiness = <String, Future<Map<String, dynamic>?>>{};

  String _actor() {
    final actor = actorId();
    if (actor == null) throw StateError('Sign in to load this list.');
    return actor;
  }

  void _checkActor(String actor) {
    if (actorId() != actor) {
      throw StateError('The signed-in account changed during this read.');
    }
  }

  /// The owner's readiness document, or null when it has none.
  Future<Map<String, dynamic>?> readiness(String scopeId) async {
    final actor = _actor();
    final key = '$actor/$scopeId';
    var pending = _readiness[key];
    if (pending == null) {
      pending = _loadReadiness(scopeId, actor);
      _readiness[key] = pending;
    }
    try {
      final data = await pending;
      _checkActor(actor);
      return data;
    } finally {
      _readiness.removeWhere(
        (entryKey, value) => entryKey == key && identical(value, pending),
      );
    }
  }

  /// The owner's readiness document once the read model behind [marker] is
  /// active. Every owner starts active, so a missing marker is a server fault
  /// to retry, not a reason to read through a Function.
  Future<Map<String, dynamic>> activatedReadiness(
    String scopeId,
    String marker,
  ) async {
    final data = await readiness(scopeId);
    if (data == null || data[marker] != 1) {
      throw StateError('This list is not ready yet. Try again shortly.');
    }
    return data;
  }

  /// The owner's readiness document while it is listened to, once the read
  /// model behind [marker] is active. A missing marker is a server fault to
  /// retry. A document the device has not cached yet does not read as
  /// missing offline: after the listener's first-value deadline the stream
  /// reports [listenerNothingSaved] and stays open.
  Stream<Map<String, dynamic>> watchActivatedReadiness(
    String scopeId,
    String marker,
  ) {
    _actor();
    return withBackendErrorStream(
      () => _firestore
          .collection(family.readinessCollection)
          .doc(scopeId)
          .snapshots()
          .where((doc) => doc.exists || !doc.metadata.isFromCache)
          .firstValueWithin(_listenerFirstValue, clock: clock),
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch read model readiness',
        resource: family.readinessCollection,
      ),
    ).map((doc) {
      final data = doc.data();
      if (data != null && data[family.scopeField] != scopeId) {
        throw const FormatException('Readiness owner does not match.');
      }
      if (data == null || data[marker] != 1) {
        throw StateError('This list is not ready yet. Try again shortly.');
      }
      return data;
    });
  }

  /// The most rows one window listens to: the largest exhaustive read (every
  /// saved group) fits in one window.
  static const maxWindow = 2500;

  /// The first [limit] rows of one query while it is listened to: the same
  /// filters and order as [page], as a listener that follows every change.
  /// Showing more means listening to a larger window. With a [marker], the
  /// window opens once the owner's readiness document says that read model is
  /// active; a missing marker is a server fault to retry.
  Stream<ReadModelWindow> watchWindow({
    required String collection,
    required String scopeId,
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
      scopeId: scopeId,
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
    Stream<ReadModelWindow> rows() => query.snapshots().map((snapshot) {
      final docs = snapshot.docs.take(boundedLimit);
      return ReadModelWindow([
        for (final doc in docs)
          if (doc.data() case final value when _isRow(value, scopeId))
            value
          else
            throw const FormatException('Unsupported read model row.'),
      ], hasMore: snapshot.docs.length > boundedLimit);
    });
    final window = withBackendErrorStream(
      rows,
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch read model rows',
        resource: collection,
      ),
    );
    return _afterActivation(scopeId, marker, window);
  }

  /// One query read [pageSize] rows at a time, every row shown kept live: the
  /// same filters and order as [page]. Each page is its own listener (see
  /// [LivePagedQuery]), so asking for more reads only the new page, up to
  /// [maxWindow] rows. With a [marker], the first page opens once the owner's
  /// readiness document says that read model is active; a missing marker is
  /// a server fault to retry.
  LivePager<Map<String, dynamic>> watchPages({
    required String collection,
    required String scopeId,
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
      scopeId: scopeId,
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
          : () => activatedReadiness(scopeId, marker),
      convert: (doc) => switch (doc.data()) {
        final value when _isRow(value, scopeId) => value,
        _ => throw const FormatException('Unsupported read model row.'),
      },
      errorContext: BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch read model rows',
        resource: collection,
      ),
    );
  }

  Query<Map<String, dynamic>> _ordered({
    required String collection,
    required String scopeId,
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
        .where(family.scopeField, isEqualTo: scopeId);
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

  /// One record while it is listened to; null while it does not
  /// exist. A record the device has not cached yet does not read as missing
  /// offline: after the listener's first-value deadline the stream reports
  /// [listenerNothingSaved] and stays open.
  Stream<Map<String, dynamic>?> watchDocument({
    required String collection,
    required String scopeId,
    required String id,
    String? marker,
  }) {
    _actor();
    Stream<Map<String, dynamic>?> record() => _firestore
        .collection(collection)
        .doc(id)
        .snapshots()
        .where((doc) => doc.exists || !doc.metadata.isFromCache)
        .firstValueWithin(_listenerFirstValue, clock: clock)
        .map((doc) {
          final data = doc.data();
          if (data != null && !_isRow(data, scopeId)) {
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
        action: 'watch selected read model record',
        resource: collection,
      ),
    );
    return _afterActivation(scopeId, marker, watched);
  }

  /// [stream] once the read model behind [marker] is active, or at once
  /// without one. An inactive marker fails as [activatedReadiness] does.
  Stream<T> _afterActivation<T>(
    String scopeId,
    String? marker,
    Stream<T> stream,
  ) => marker == null
      ? stream
      : Stream.fromFuture(
          activatedReadiness(scopeId, marker),
        ).asyncExpand((_) => stream);

  Future<Map<String, dynamic>?> _loadReadiness(
    String scopeId,
    String actor,
  ) async {
    final snapshot = await withBackendErrorContext(
      () =>
          _firestore.collection(family.readinessCollection).doc(scopeId).get(),
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'load read model readiness',
        resource: family.readinessCollection,
      ),
    );
    _checkActor(actor);
    final data = snapshot.data();
    if (data != null && data[family.scopeField] != scopeId) {
      throw const FormatException('Readiness owner does not match.');
    }
    return data;
  }

  /// Whether [value] is a row of this family that belongs to [scopeId].
  bool _isRow(Map<String, dynamic> value, String scopeId) =>
      value[family.scopeField] == scopeId && value['version'] == family.version;

  Future<Map<String, dynamic>?> document({
    required String collection,
    required String scopeId,
    required String id,
  }) async {
    final actor = _actor();
    final snapshot = await withBackendErrorContext(
      () => _firestore.collection(collection).doc(id).get(),
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'load selected read model record',
        resource: collection,
      ),
    );
    _checkActor(actor);
    final data = snapshot.data();
    if (data != null && !_isRow(data, scopeId)) {
      throw const FormatException('Selected record owner or version changed.');
    }
    return data;
  }

  Future<ReadModelPage> page({
    required String collection,
    required String scopeId,
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
    final scope = ReadModelCursor.scope(actor, scopeId, collection, queryKey);
    final position = ReadModelCursor.decode(cursor, scope);
    final boundedLimit = limit.clamp(1, 100);
    var query = _ordered(
      collection: collection,
      scopeId: scopeId,
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
        action: 'load read model rows',
        resource: collection,
      ),
    );
    _checkActor(actor);
    final docs = snapshot.docs.take(boundedLimit).toList(growable: false);
    final data = docs
        .map((doc) {
          final value = doc.data();
          if (!_isRow(value, scopeId)) {
            throw const FormatException('Unsupported read model row.');
          }
          return value;
        })
        .toList(growable: false);
    final last = docs.isEmpty ? null : docs.last;
    return ReadModelPage(
      data,
      snapshot.docs.length > boundedLimit && last != null
          ? ReadModelCursor.encode(scope, last.get(orderField), last.id)
          : null,
    );
  }
}
