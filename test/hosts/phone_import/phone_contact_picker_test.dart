import 'dart:io';

import 'package:catch_dating_app/contexts/programmes/data/phone_contact_picker.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('catch/phone_contacts');
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  tearDown(() => messenger.setMockMethodCallHandler(channel, null));
  NativePhoneContactPicker picker({bool web = false}) =>
      NativePhoneContactPicker(platform: TargetPlatform.iOS, isWeb: web);

  test(
    'channel returns only selected name and numbers; format duplicates collapse locally',
    () async {
      messenger.setMockMethodCallHandler(channel, (call) async {
        expect(call.method, 'pickContacts');
        expect(call.arguments, isNull);
        return {
          'status': 'selected',
          'contacts': [
            {
              'id': 'synthetic-one',
              'name': ' Asha ',
              'phones': [
                {'value': '+1 (202) 555-0101', 'label': 'home'},
                {'value': '+12025550101', 'label': 'mobile'},
                {'value': ' ', 'label': ''},
              ],
            },
            {'id': 'synthetic-two', 'name': '', 'phones': []},
          ],
        };
      });
      final result = await picker().pickContacts();
      expect(result.status, PhoneContactPickerStatus.selected);
      expect(result.contacts.first.displayName, 'Asha');
      expect(result.contacts.first.numbers.length, 1);
      expect(result.contacts.last.displayName, isEmpty);
      expect(result.contacts.last.numbers, isEmpty);
    },
  );
  for (final status in [
    'cancelled',
    'denied',
    'unavailable',
    'failed',
    'too_many',
  ]) {
    test('native $status never returns or retains contact data', () async {
      messenger.setMockMethodCallHandler(
        channel,
        (_) async => {
          'status': status,
          'contacts': [
            {'name': 'ignored'},
          ],
        },
      );
      final result = await picker().pickContacts();
      expect(result.status.name, status == 'too_many' ? 'tooMany' : status);
      expect(result.contacts, isEmpty);
    });
  }
  test('web never invokes native channel', () async {
    messenger.setMockMethodCallHandler(channel, (_) async {
      fail('Native picker invoked on web');
    });
    expect(
      (await picker(web: true).pickContacts()).status,
      PhoneContactPickerStatus.unavailable,
    );
  });
  test('missing native plugin is unavailable', () async {
    expect(
      (await picker().pickContacts()).status,
      PhoneContactPickerStatus.unavailable,
    );
  });
  test(
    'malformed selected result fails closed with no partial contacts',
    () async {
      messenger.setMockMethodCallHandler(
        channel,
        (_) async => {
          'status': 'selected',
          'contacts': [
            {'id': 'synthetic', 'name': 'Guest', 'phones': []},
            {'id': null, 'name': 'Bad', 'phones': []},
          ],
        },
      );
      final result = await picker().pickContacts();
      expect(result.status, PhoneContactPickerStatus.failed);
      expect(result.contacts, isEmpty);
    },
  );
  test('platform denial is surfaced without a permission retry', () async {
    var calls = 0;
    messenger.setMockMethodCallHandler(channel, (_) async {
      calls++;
      throw PlatformException(code: 'denied');
    });
    expect(
      (await picker().pickContacts()).status,
      PhoneContactPickerStatus.denied,
    );
    expect(calls, 1);
  });
  test('native policy uses selected-only URI and no broad contacts permission', () {
    final swift = File(
      'apps/host/ios/Runner/AppDelegate.swift',
    ).readAsStringSync();
    final kotlin = File(
      'apps/host/android/app/src/main/kotlin/com/catchdates/app/NativePhoneContactsPicker.kt',
    ).readAsStringSync();
    final manifest = File(
      'apps/host/android/app/src/main/AndroidManifest.xml',
    ).readAsStringSync();
    expect(swift, contains('didSelect contacts: [CNContact]'));
    expect(swift, isNot(contains('CNContactStore()')));
    expect(kotlin, contains('Build.VERSION.SDK_INT >= 37'));
    expect(kotlin, contains('android.provider.action.PICK_CONTACTS'));
    expect(
      kotlin,
      contains('android.provider.extra.PICK_CONTACTS_REQUESTED_DATA_FIELDS'),
    );
    expect(
      kotlin,
      contains('contentResolver.query(uri, projection, null, null, null)'),
    );
    expect(
      kotlin,
      contains(
        'Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI)',
      ),
    );
    expect(kotlin, isNot(contains('requestPermissions')));
    expect(manifest, isNot(contains('android.permission.READ_CONTACTS')));
  });
}
