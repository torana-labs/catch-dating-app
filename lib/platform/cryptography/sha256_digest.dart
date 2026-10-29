import 'dart:convert';

import 'package:crypto/crypto.dart';

/// Returns the lowercase SHA-256 digest for a UTF-8 string.
String sha256Digest(String value) =>
    sha256.convert(utf8.encode(value)).toString();
