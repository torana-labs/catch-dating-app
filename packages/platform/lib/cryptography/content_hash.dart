import 'dart:convert';

import 'package:catch_platform/cryptography/sha256_digest.dart';

/// The Functions `operationContentHash` of a JSON value: SHA-256 of its
/// canonical JSON (object keys sorted, no whitespace). Server-written
/// records are named with it, so the app derives the same document ids.
/// Only JSON values with integer numbers are accepted, as on the server.
String operationContentHash(Object? value) =>
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
