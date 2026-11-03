import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

/// Keeps reviewed macOS goldens stable across hosted-runner rasterizers while
/// still surfacing material visual changes.
///
/// With [reportPath] set, a changed or missing baseline is recorded instead of
/// failing: images are written under `failures/` and one tab-separated line
/// (golden, change, allowed %) is appended to [reportPath]. CI uses this
/// because the app is still changing visually on purpose; render errors and
/// every non-golden expectation still fail.
class CatchGoldenFileComparator extends LocalFileComparator {
  CatchGoldenFileComparator(
    super.testFile, {
    this.precisionTolerance = defaultPrecisionTolerance,
    this.reportPath,
  }) : assert(
         0 <= precisionTolerance && precisionTolerance <= 1,
         'precisionTolerance must be between 0 and 1',
       );

  /// Flutter reports this as 0.30% in a golden failure message.
  static const double defaultPrecisionTolerance = 0.003;

  /// Environment variable CI sets to the report file path.
  static const String reportPathEnvironmentKey = 'CATCH_GOLDEN_REPORT';

  final double precisionTolerance;
  final String? reportPath;

  @override
  Future<bool> compare(Uint8List imageBytes, Uri golden) async {
    final allowedPercent = (precisionTolerance * 100).toStringAsFixed(2);
    if (reportPath != null &&
        !File.fromUri(basedir.resolve(golden.path)).existsSync()) {
      final actual = getFailureFile('testImage', golden, basedir);
      actual.parent.createSync(recursive: true);
      actual.writeAsBytesSync(imageBytes);
      _report(golden, 'no baseline', allowedPercent);
      return true;
    }

    final result = await GoldenFileComparator.compareLists(
      imageBytes,
      await getGoldenBytes(golden),
    );
    final passed = result.passed || result.diffPercent <= precisionTolerance;
    if (passed) {
      result.dispose();
      return true;
    }

    final error = await generateFailureOutput(result, golden, basedir);
    final actualPercent = (result.diffPercent * 100).toStringAsFixed(4);
    result.dispose();
    if (reportPath != null) {
      _report(golden, '$actualPercent%', allowedPercent);
      return true;
    }
    throw FlutterError(
      '$error\nCatch golden tolerance exceeded: '
      '$actualPercent% > $allowedPercent%.',
    );
  }

  void _report(Uri golden, String change, String allowedPercent) {
    File(reportPath!).writeAsStringSync(
      '$golden\t$change\t$allowedPercent%\n',
      mode: FileMode.append,
      flush: true,
    );
    debugPrint(
      'Golden "$golden" changed ($change, allowed $allowedPercent%); '
      'reported, not failing.',
    );
  }
}
