import 'package:catch_dating_app/contexts/programmes/domain/phone_contact.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

enum PhoneContactPickerStatus {
  selected,
  cancelled,
  denied,
  unavailable,
  failed,
  tooMany,
}

class PhoneContactPickerResult {
  PhoneContactPickerResult(
    this.status, [
    List<PhoneContact> contacts = const [],
  ]) : contacts = List.unmodifiable(contacts);
  final PhoneContactPickerStatus status;
  final List<PhoneContact> contacts;
}

abstract interface class PhoneContactPicker {
  Future<PhoneContactPickerResult> pickContacts();
}

/// No contacts permission request, enumeration, caching, analytics or upload.
class NativePhoneContactPicker implements PhoneContactPicker {
  const NativePhoneContactPicker({
    this.channel = const MethodChannel('catch/phone_contacts'),
    this.platform,
    this.isWeb,
  });
  final MethodChannel channel;
  final TargetPlatform? platform;
  final bool? isWeb;

  @override
  Future<PhoneContactPickerResult> pickContacts() async {
    final target = platform ?? defaultTargetPlatform;
    if ((isWeb ?? kIsWeb) ||
        (target != TargetPlatform.iOS && target != TargetPlatform.android)) {
      return PhoneContactPickerResult(PhoneContactPickerStatus.unavailable);
    }
    try {
      final result = await channel.invokeMapMethod<String, dynamic>(
        'pickContacts',
      );
      if (result == null) {
        return PhoneContactPickerResult(PhoneContactPickerStatus.failed);
      }
      final status = switch (result['status']) {
        'selected' => PhoneContactPickerStatus.selected,
        'cancelled' => PhoneContactPickerStatus.cancelled,
        'denied' => PhoneContactPickerStatus.denied,
        'unavailable' => PhoneContactPickerStatus.unavailable,
        'too_many' => PhoneContactPickerStatus.tooMany,
        _ => PhoneContactPickerStatus.failed,
      };
      if (status != PhoneContactPickerStatus.selected) {
        return PhoneContactPickerResult(status);
      }
      final rows = result['contacts'];
      if (rows is! List || rows.length > 100) {
        return PhoneContactPickerResult(PhoneContactPickerStatus.failed);
      }
      final contacts = <PhoneContact>[];
      for (final row in rows) {
        if (row is! Map ||
            row['id'] is! String ||
            (row['id'] as String).isEmpty ||
            row['name'] is! String ||
            row['phones'] is! List) {
          return PhoneContactPickerResult(PhoneContactPickerStatus.failed);
        }
        final numbers = <PhoneContactNumber>[];
        for (final number in row['phones'] as List) {
          if (number is! Map ||
              number['value'] is! String ||
              number['label'] is! String) {
            return PhoneContactPickerResult(PhoneContactPickerStatus.failed);
          }
          final value = (number['value'] as String).trim();
          if (value.isNotEmpty &&
              !numbers.any(
                (n) => phoneSelectionKey(n.value) == phoneSelectionKey(value),
              )) {
            numbers.add(
              PhoneContactNumber(
                value: value,
                label: number['label'] as String,
              ),
            );
          }
        }
        contacts.add(
          PhoneContact(
            localId: row['id'] as String,
            displayName: (row['name'] as String).trim(),
            numbers: numbers,
          ),
        );
      }
      return PhoneContactPickerResult(status, contacts);
    } on MissingPluginException {
      return PhoneContactPickerResult(PhoneContactPickerStatus.unavailable);
    } on PlatformException catch (error) {
      return PhoneContactPickerResult(
        error.code == 'denied'
            ? PhoneContactPickerStatus.denied
            : PhoneContactPickerStatus.failed,
      );
    }
  }
}
