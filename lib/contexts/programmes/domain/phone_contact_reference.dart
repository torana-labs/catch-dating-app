import 'dart:convert';

import 'package:catch_dating_app/platform/cryptography/sha256_digest.dart';

/// Opaque upstream identity for one user-selected local contact. Scope and
/// actor are included so separate address books/weddings never match through
/// phone numbers, names or a raw platform identifier. This grants no rights.
String phoneContactReferenceId({
  required String accountId,
  required String programId,
  required String localContactId,
}) => sha256Digest(
  jsonEncode(['catch_phone_contact_v1', accountId, programId, localContactId]),
);
