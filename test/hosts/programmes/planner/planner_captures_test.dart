import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/catch_test_fonts.dart';
import '../../../ui_captures/support/capture_device.dart';
import '../../../ui_captures/support/capture_pump.dart';
import 'planner_captures.dart';

/// Renders the planner capture fixtures to PNGs when PLANNER_CAPTURE_DIR
/// is set (`flutter test --dart-define=PLANNER_CAPTURE_DIR=<dir>`);
/// otherwise it only proves each fixture screen builds.
void main() {
  const directory = String.fromEnvironment('PLANNER_CAPTURE_DIR');
  const phone = CaptureDevice(id: 'planner-phone', size: Size(390, 1400));
  const desktop = CaptureDevice(
    id: 'planner-desktop',
    size: plannerDesktopSize,
  );
  final captures = <(String, WidgetBuilder, CaptureDevice)>[
    ('host_programme_phone', (_) => plannerProgrammeCapture(), phone),
    ('host_programme_function_phone', (_) => plannerFunctionCapture(), phone),
    ('host_programme_guests_phone', (_) => plannerGuestsCapture(), phone),
    ('host_programme_guests_desktop', (_) => plannerGuestsCapture(), desktop),
    ('host_programme_household_phone', (_) => plannerHouseholdCapture(), phone),
    ('host_programme_travel_phone', (_) => plannerTravelCapture(), phone),
    ('host_programme_rooms_desktop', (_) => plannerRoomsCapture(), desktop),
    ('host_programme_trips_desktop', (_) => plannerTripsCapture(), desktop),
    ('host_programme_create_phone', (_) => plannerCreateCapture(), phone),
    ('host_programme_messages_phone', (_) => plannerMessagesCapture(), phone),
    ('host_programme_message_phone', (_) => plannerMessageCapture(), phone),
  ];
  setUpAll(loadCatchTestFonts);
  for (final (id, builder, device) in captures) {
    testWidgets('$id renders', (tester) async {
      final output = directory.isEmpty
          ? Directory.systemTemp.createTempSync('planner-capture-')
          : Directory(directory);
      final artifacts = await captureCatchWidget(
        tester,
        id: id,
        builder: builder,
        outputDirectory: output,
        device: device,
        themes: const [CaptureTheme.light],
        providerOverrides: plannerCaptureOverrides(),
      );
      expect(artifacts.single.file.existsSync(), isTrue);
      expect(tester.takeException(), isNull);
      if (directory.isEmpty) output.deleteSync(recursive: true);
    });
  }
}
