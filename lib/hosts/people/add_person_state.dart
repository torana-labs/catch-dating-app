import 'package:flutter/foundation.dart';

/// What the host typed on Add person, as the create command takes it: the
/// name trimmed, the mobile number without spaces, brackets or dashes, the
/// email lower-cased, and a blank note left out.
@immutable
class HostAddPersonDraft {
  const HostAddPersonDraft({
    required this.name,
    required this.phone,
    required this.email,
    required this.note,
  });

  /// Reads the four fields as typed.
  factory HostAddPersonDraft.typed({
    required String name,
    required String phone,
    required String email,
    required String note,
  }) => HostAddPersonDraft(
    name: name.trim(),
    phone: _trimmedOrNull(phone)?.replaceAll(RegExp(r'[()\s-]+'), ''),
    email: _trimmedOrNull(email)?.toLowerCase(),
    note: _trimmedOrNull(note),
  );

  final String name;
  final String? phone;
  final String? email;
  final String? note;

  /// A person needs at least one way to be reached.
  bool get hasContactMethod => phone != null || email != null;

  bool get nameValid => name.isNotEmpty;

  /// A blank number is fine; a typed one must be E.164.
  bool get phoneValid => phone == null || _e164.hasMatch(phone!);

  /// A blank email is fine; a typed one must look like an address.
  bool get emailValid => email == null || _email.hasMatch(email!);

  bool get valid => nameValid && phoneValid && emailValid && hasContactMethod;
}

/// Whether a typed mobile number can be sent; blank counts as valid.
bool hostAddPersonPhoneValid(String value) => HostAddPersonDraft.typed(
  name: '',
  phone: value,
  email: '',
  note: '',
).phoneValid;

/// Whether a typed email can be sent; blank counts as valid.
bool hostAddPersonEmailValid(String value) => HostAddPersonDraft.typed(
  name: '',
  phone: '',
  email: value,
  note: '',
).emailValid;

final _e164 = RegExp(r'^\+[1-9][0-9]{7,14}$');
final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

String? _trimmedOrNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}
