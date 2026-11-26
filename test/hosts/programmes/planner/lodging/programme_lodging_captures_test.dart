import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_providers.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_screen.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_test_support/programmes/program_operations_fixture.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod/misc.dart' show Override;

import '../../../../programs/program_lodging_test_fixtures.dart';
import '../../../../ui_captures/support/capture_device.dart';
import '../../../../ui_captures/support/capture_pump.dart';

/// Renders the stay planner to PNGs when LODGING_CAPTURE_DIR is set
/// (`flutter test --dart-define=LODGING_CAPTURE_DIR=<dir>`); otherwise it
/// only proves each view builds at phone and desktop width, at text scale
/// 1 and 2.
void main() {
  const directory = String.fromEnvironment('LODGING_CAPTURE_DIR');
  const phone = CaptureDevice(id: 'lodging-phone', size: Size(390, 1600));
  const desktop = CaptureDevice(id: 'lodging-desktop', size: Size(1440, 1100));
  List<Override> overrides({bool setup = true}) => [
    uidProvider.overrideWithValue(const AsyncData('actor')),
    programReadSnapshotStoreProvider.overrideWithValue(emptyProgramSnapshots()),
    programLodgingRepositoryProvider.overrideWithValue(
      FakeLodgingRepository()..hasSetup = setup,
    ),
  ];
  Future<void> openSetup(WidgetTester tester) async {
    await tester.tap(find.text('Edit dates, sharing and inventory'));
    await tester.pumpAndSettle();
  }

  final captures =
      <(String, CaptureDevice, double, Future<void> Function(WidgetTester)?)>[
        ('host_programme_lodging_desktop', desktop, 1, null),
        ('host_programme_lodging_phone', phone, 1, null),
        ('host_programme_lodging_phone_text2', phone, 2, null),
        ('host_programme_lodging_setup_phone', phone, 1, openSetup),
        ('host_programme_lodging_setup_phone_text2', phone, 2, openSetup),
      ];
  setUpAll(loadCatchTestFonts);
  for (final (id, device, textScale, drive) in captures) {
    testWidgets('$id renders', (tester) async {
      final output = directory.isEmpty
          ? Directory.systemTemp.createTempSync('lodging-capture-')
          : Directory(directory);
      final artifacts = await captureCatchWidget(
        tester,
        id: id,
        builder: (_) => const HostProgrammeLodgingScreen(programId: 'program'),
        outputDirectory: output,
        device: device,
        textScale: textScale,
        drive: drive,
        themes: const [CaptureTheme.light],
        providerOverrides: overrides(),
      );
      expect(artifacts.single.file.existsSync(), isTrue);
      expect(tester.takeException(), isNull);
      if (directory.isEmpty) output.deleteSync(recursive: true);
    });
  }
}
