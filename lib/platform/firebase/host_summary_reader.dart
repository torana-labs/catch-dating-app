import 'dart:convert';

import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:crypto/crypto.dart';

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

/// Server reads reauthorize every request. Only concurrent migration-marker
/// reads are shared, scoped to the current account; no repository PII cache.
class HostSummaryReader {
  HostSummaryReader(this._firestore, {required this.actorId});
  final FirebaseFirestore _firestore;
  final String? Function() actorId;
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

  Future<Map<String, dynamic>?> _loadDirectory(
    String organizerId,
    String actor,
  ) async {
    final snapshot = await withBackendErrorContext(
      () => _firestore
          .collection('hostDirectorySummaries')
          .doc(organizerId)
          .get(const GetOptions(source: Source.server)),
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
      () => _firestore
          .collection(collection)
          .doc(id)
          .get(const GetOptions(source: Source.server)),
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
    query = query
        .orderBy(orderField, descending: descending)
        .orderBy(FieldPath.documentId, descending: descending);
    if (position != null) query = query.startAfter(position);
    final snapshot = await withBackendErrorContext(
      () => query
          .limit(boundedLimit + 1)
          .get(const GetOptions(source: Source.server)),
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
