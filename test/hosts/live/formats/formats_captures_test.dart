import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/catch_test_fonts.dart';
import '../../../ui_captures/support/capture_device.dart';
import '../../../ui_captures/support/capture_pump.dart';
import 'formats_captures.dart';

/// Renders the formats capture fixtures to PNGs when FORMATS_CAPTURE_DIR is
/// set (`flutter test --dart-define=FORMATS_CAPTURE_DIR=<dir>`); otherwise
/// it only proves each fixture screen builds.
void main() {
  const directory = String.fromEnvironment('FORMATS_CAPTURE_DIR');
  const phone = CaptureDevice(id: 'formats-phone', size: Size(390, 1500));
  const tablet = CaptureDevice(
    id: 'formats-tablet',
    size: hostFormatsTabletSize,
  );
  final captures = <(String, WidgetBuilder, CaptureDevice, CaptureTheme)>[
    (
      'host_formats_courts_setup_phone',
      (_) => hostFormatsCourtsSetupCapture(),
      phone,
      CaptureTheme.light,
    ),
    (
      'host_formats_courts_phone',
      (_) => hostFormatsCourtsCapture(),
      phone,
      CaptureTheme.dark,
    ),
    (
      'host_formats_courts_tablet',
      (_) => hostFormatsCourtsCapture(),
      tablet,
      CaptureTheme.dark,
    ),
    (
      'host_formats_mix_phone',
      (_) => hostFormatsMixCapture(),
      phone,
      CaptureTheme.dark,
    ),
    (
      'host_formats_crawl_phone',
      (_) => hostFormatsCrawlCapture(),
      phone,
      CaptureTheme.dark,
    ),
    (
      'host_formats_crawl_move_phone',
      (_) => hostFormatsCrawlCapture(moving: true),
      phone,
      CaptureTheme.dark,
    ),
    (
      'host_formats_pods_phone',
      (_) => hostFormatsPodsCapture(),
      phone,
      CaptureTheme.light,
    ),
    (
      'host_formats_rules_phone',
      (_) => hostFormatsRulesCapture(),
      phone,
      CaptureTheme.light,
    ),
    (
      'host_formats_rule_sheet_phone',
      (_) => hostFormatsRulesCapture(adding: true),
      phone,
      CaptureTheme.light,
    ),
  ];
  setUpAll(loadCatchTestFonts);
  for (final (id, builder, device, theme) in captures) {
    testWidgets('$id renders', (tester) async {
      final output = directory.isEmpty
          ? Directory.systemTemp.createTempSync('formats-capture-')
          : Directory(directory);
      final artifacts = await captureCatchWidget(
        tester,
        id: id,
        builder: builder,
        outputDirectory: output,
        device: device,
        themes: [theme],
        providerOverrides: hostFormatsCaptureOverrides(),
      );
      expect(artifacts.single.file.existsSync(), isTrue);
      expect(tester.takeException(), isNull);
      if (directory.isEmpty) output.deleteSync(recursive: true);
    });
  }
}
