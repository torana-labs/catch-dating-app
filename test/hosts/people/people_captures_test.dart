import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../ui_captures/support/capture_device.dart';
import '../../ui_captures/support/capture_pump.dart';
import 'people_captures.dart';

/// Renders the People capture fixtures to PNGs when PEOPLE_CAPTURE_DIR is
/// set (`flutter test --dart-define=PEOPLE_CAPTURE_DIR=<dir>`); otherwise it
/// only proves each fixture screen builds.
void main() {
  const directory = String.fromEnvironment('PEOPLE_CAPTURE_DIR');
  const phone = CaptureDevice(id: 'people-phone', size: Size(390, 1240));
  const desktop = CaptureDevice(
    id: 'people-desktop',
    size: hostPeopleDesktopSize,
  );
  final captures = <(String, WidgetBuilder, CaptureDevice)>[
    ('host_people_phone', (_) => hostPeopleCapture(), phone),
    ('host_people_desktop', (_) => hostPeopleDesktopCapture(), desktop),
    ('host_person_phone', (_) => hostPersonCapture(), phone),
    ('host_messages_phone', (_) => hostMessagesCapture(), phone),
    ('host_compose_phone', (_) => hostComposeCapture(), phone),
    ('host_automations_phone', (_) => hostAutomationsCapture(), phone),
    ('host_saved_group_phone', (_) => hostSavedGroupCapture(), phone),
  ];
  setUpAll(loadCatchTestFonts);
  for (final (id, builder, device) in captures) {
    testWidgets('$id renders', (tester) async {
      final output = directory.isEmpty
          ? Directory.systemTemp.createTempSync('people-capture-')
          : Directory(directory);
      final artifacts = await captureCatchWidget(
        tester,
        id: id,
        builder: builder,
        outputDirectory: output,
        device: device,
        themes: const [CaptureTheme.light],
        providerOverrides: hostPeopleCaptureOverrides(),
      );
      expect(artifacts.single.file.existsSync(), isTrue);
      expect(tester.takeException(), isNull);
      if (directory.isEmpty) output.deleteSync(recursive: true);
    });
  }
}
