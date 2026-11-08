import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/catch_test_fonts.dart';
import '../../../ui_captures/support/capture_device.dart';
import '../../../ui_captures/support/capture_pump.dart';
import 'staff_captures.dart';

/// Renders the staff capture fixtures to PNGs when STAFF_CAPTURE_DIR is set
/// (`flutter test --dart-define=STAFF_CAPTURE_DIR=<dir>`); otherwise it only
/// proves each screen builds over its fixture reads.
void main() {
  const directory = String.fromEnvironment('STAFF_CAPTURE_DIR');
  const phone = CaptureDevice(id: 'staff-phone', size: Size(390, 1240));
  final captures = <(String, WidgetBuilder, bool)>[
    ('host_staff_work_phone', (_) => hostStaffWorkCapture(), false),
    ('host_staff_jobs_phone', (_) => hostStaffJobsCapture(), false),
    ('host_staff_arrivals_phone', (_) => hostStaffArrivalsCapture(), false),
    ('host_staff_dispatch_phone', (_) => hostStaffDispatchCapture(), false),
    (
      'host_staff_dispatch_sheet_phone',
      (_) => hostStaffDispatchCapture(sheet: true),
      false,
    ),
    ('host_staff_hotel_desk_phone', (_) => hostStaffHotelDeskCapture(), false),
    ('host_staff_door_phone', (_) => hostStaffDoorCapture(), true),
    ('host_staff_lead_phone', (_) => hostStaffLeadCapture(), false),
    ('host_staff_alerts_phone', (_) => hostStaffAlertsCapture(), false),
  ];
  setUpAll(loadCatchTestFonts);
  for (final (id, builder, offline) in captures) {
    testWidgets('$id renders', (tester) async {
      final output = directory.isEmpty
          ? Directory.systemTemp.createTempSync('staff-capture-')
          : Directory(directory);
      final artifacts = await captureCatchWidget(
        tester,
        id: id,
        builder: builder,
        outputDirectory: output,
        device: phone,
        themes: const [CaptureTheme.light],
        providerOverrides: hostStaffCaptureOverrides(
          outbox: offline
              ? staffOfflineOutbox()
              : hostStaffCaptureOverridesEmptyOutbox,
          offline: offline,
        ),
      );
      expect(artifacts.single.file.existsSync(), isTrue);
      expect(tester.takeException(), isNull);
      if (directory.isEmpty) output.deleteSync(recursive: true);
    });
  }
}
