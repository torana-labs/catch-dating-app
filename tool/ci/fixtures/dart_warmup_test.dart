// Warm-up for the Tools buckets that run Dart. CI analyzes and runs this file
// once after pub get ("Warm up Dart analyzer and test runner" in
// .github/workflows/tools-ci.yml), so the first real `dart analyze` and
// `flutter test` in a bucket no longer pay the analyzer, analyzer-plugin and
// test-runner startup, and the measured per-tool timings stay per tool.
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the Dart analyzer and test runner are warm', () {
    expect(1 + 1, 2);
  });
}
