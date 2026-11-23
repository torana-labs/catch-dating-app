import 'dart:async';

import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Auto-discovered by `flutter test` for tests under `test/ui_captures/`.
/// Mirrors the golden-test font setup so generated captures use the same
/// committed app fonts as runtime UI.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});
  const nativeIosFont = String.fromEnvironment('CAPTURE_SF_FONT');
  await loadCatchTestFonts(
    nativeIosFontPath: nativeIosFont.isEmpty ? null : nativeIosFont,
  );
  await testMain();
}
