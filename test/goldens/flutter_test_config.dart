import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import 'support/catch_golden_file_comparator.dart';

/// Auto-discovered by `flutter test` for EVERY test under `test/goldens/` (and
/// nowhere else — the app's other ~1200 tests are unaffected).
///
/// Catch bundles its identity fonts (see `pubspec.yaml`), so goldens load the
/// same Archivo and IBM Plex Mono assets the app ships and register them under
/// the plain family names [CatchFonts] requests. Deterministic Roboto files
/// stand in for the concrete platform function-family aliases. Icon fonts are
/// also registered so app chrome renders as real glyphs instead of
/// missing-glyph boxes. Test-only — adds no app assets.
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
