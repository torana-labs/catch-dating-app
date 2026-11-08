import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../ui_captures/support/capture_device.dart';
import '../../ui_captures/support/capture_pump.dart';
import 'forms_captures.dart';

/// Writes the forms phone captures when FORMS_CAPTURE_OUTPUT names a folder;
/// otherwise each capture still renders without an exception.
void main() {
  setUpAll(loadCatchTestFonts);
  const output = String.fromEnvironment('FORMS_CAPTURE_OUTPUT');
  for (final entry in hostFormsCaptures.entries) {
    testWidgets('forms capture ${entry.key}', (tester) async {
      final directory = output.isEmpty
          ? Directory.systemTemp.createTempSync('forms-capture-')
          : Directory(output);
      await captureCatchWidget(
        tester,
        id: entry.key,
        outputDirectory: directory,
        device: CaptureDevice.claudePhone390,
        themes: const [CaptureTheme.light],
        builder: (_) => entry.value(),
      );
      expect(tester.takeException(), isNull);
    });
  }
}
