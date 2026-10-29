import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:catch_dating_app/contexts/profiles/domain/form_profile_photo_preview.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profile_photo_field.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  test('preview rejects oversized, wrong-type and non-JPEG payloads', () {
    final valid = <String, Object?>{
      'contentType': 'image/jpeg',
      'previewBase64': base64Encode([0xff, 0xd8, 0xff]),
      'width': 100,
      'height': 100,
    };
    for (final patch in [
      {'contentType': 'image/png'},
      {'width': 0},
      {'height': 641},
      {'width': 1.5},
      {'previewBase64': 'not-base64'},
      {
        'previewBase64': base64Encode([1, 2, 3]),
      },
      {'previewBase64': base64Encode(Uint8List(256 * 1024 + 1))},
    ]) {
      expect(
        () => FormProfilePhotoPreview.fromMap({...valid, ...patch}),
        throwsFormatException,
      );
    }
    final source = Uint8List.fromList([0xff, 0xd8, 0xff]);
    final photo = FormProfilePhotoPreview(bytes: source, width: 1, height: 1);
    source[0] = 0;
    expect(photo.bytes[0], 0xff);
    expect(() => photo.bytes[0] = 0, throwsUnsupportedError);
  });

  testWidgets(
    'selection waits for decoding; leaving evicts the private image',
    (tester) async {
      final photo = FormProfilePhotoPreview(
        bytes: File('test/goldens/fixtures/portrait.jpg').readAsBytesSync(),
        width: 160,
        height: 200,
      );
      var selected = false;
      await _pump(tester, photo, (value) => selected = value);
      CatchToggleInput field() =>
          tester.widget<CatchToggleInput>(find.byType(CatchToggleInput));
      // No application-selection gesture is enabled before an image frame.
      expect(selected, false);
      await tester.runAsync(() async {
        await precacheImage(
          MemoryImage(photo.bytes),
          tester.element(find.byType(FormProfilePhotoSelectionField)),
        );
      });
      await pumpFeatureUi(tester);
      expect(field().onChanged, isNotNull);
      await tester.ensureVisible(find.byType(CatchToggleInput));
      await tester.tap(find.byType(CatchToggleInput));
      await pumpFeatureUi(tester);
      expect(selected, true);
      final key = MemoryImage(photo.bytes);
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
      expect(PaintingBinding.instance.imageCache.containsKey(key), false);
    },
  );

  testWidgets('decode failure leaves selection disabled and offers retry', (
    tester,
  ) async {
    var retried = false;
    await _pump(
      tester,
      FormProfilePhotoPreview(
        bytes: Uint8List.fromList([0xff, 0xd8, 0xff]),
        width: 1,
        height: 1,
      ),
      (_) => fail('Invalid photo cannot be selected'),
      onRetry: () => retried = true,
    );
    await tester.runAsync(() async {
      await flushTestEventQueue();
    });
    await pumpUntilFound(tester, find.text('Retry photo preview'));
    final field = tester.widget<CatchToggleInput>(
      find.byType(CatchToggleInput),
    );
    expect(field.onChanged, isNull);
    expect(find.text('Retry photo preview'), findsOneWidget);
    await tester.ensureVisible(find.text('Retry photo preview'));
    await tester.tap(find.text('Retry photo preview'));
    expect(retried, true);
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pump(
  WidgetTester tester,
  FormProfilePhotoPreview photo,
  ValueChanged<bool> onChanged, {
  VoidCallback? onRetry,
}) => tester.pumpWidget(
  MaterialApp(
    theme: AppTheme.light,
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: Scaffold(
      body: SingleChildScrollView(
        child: FormProfilePhotoSelectionField(
          photo: photo,
          label: 'Your photo',
          selected: false,
          onChanged: onChanged,
          onRetry: onRetry ?? () {},
        ),
      ),
    ),
  ),
);
