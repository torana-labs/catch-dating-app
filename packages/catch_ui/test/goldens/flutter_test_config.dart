import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'support/catch_golden_file_comparator.dart';
import 'support/catch_test_fonts.dart';

/// Auto-discovered by `flutter test` for every test under
/// `packages/catch_ui/test/goldens/`, and nowhere else in the package.
///
/// Goldens load the fonts the package ships (Archivo, Lucide, IBM Plex Mono)
/// under `packages/catch_ui/<family>`, as Flutter registers them at runtime,
/// and deterministic Roboto files stand in for the platform function-family
/// aliases. Test-only: adds no package assets.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  TestWidgetsFlutterBinding.ensureInitialized();
  await loadCatchTestFonts();
  goldenFileComparator = CatchGoldenFileComparator(
    Uri.parse('test/goldens/flutter_test_config.dart'),
    reportPath: Platform
        .environment[CatchGoldenFileComparator.reportPathEnvironmentKey],
  );
  await testMain();
}
