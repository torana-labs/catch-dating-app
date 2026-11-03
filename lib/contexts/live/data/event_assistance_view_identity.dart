import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_platform/cryptography/sha256_digest.dart';

/// Document ids of the live console's movement views. The server names each
/// view after the record it projects (`progressIdentity`, `checkpointIdentity`
/// in Functions): SHA-256 of the canonical JSON of the scope, keys sorted.
/// Vectors pinned on both sides keep the two derivations equal.
String groupProgressViewId(EventAssistanceGroupScope scope) =>
    'progress:${assistanceContentHash([scope.context, scope.groupId])}';

String checkpointViewId(EventAssistanceCheckpointScope scope) =>
    'checkpoint:${assistanceContentHash([scope.group.context, scope.group.groupId, scope.progressRevision, scope.checkpointId])}';

/// The Functions `operationContentHash` of a JSON value.
String assistanceContentHash(Object? value) =>
    sha256Digest(_canonicalJson(value));

String _canonicalJson(Object? value) {
  if (value == null || value is String || value is bool || value is int) {
    return jsonEncode(value);
  }
  if (value is List) return '[${value.map(_canonicalJson).join(',')}]';
  if (value is Map) {
    final keys = value.keys.cast<String>().toList()..sort();
    return '{${keys.map((key) => '${jsonEncode(key)}:${_canonicalJson(value[key])}').join(',')}}';
  }
  throw ArgumentError.value(value, 'value', 'Not a canonical JSON value.');
}
