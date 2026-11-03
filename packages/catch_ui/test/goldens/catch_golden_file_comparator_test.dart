import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;

import 'support/catch_golden_file_comparator.dart';

void main() {
  test(
    'allows hosted-macOS raster noise but rejects larger visual drift',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'catch-golden-comparator-',
      );
      addTearDown(() => directory.delete(recursive: true));

      final master = _pngWithChangedPixels(0);
      await File('${directory.path}/baseline.png').writeAsBytes(master);
      final comparator = CatchGoldenFileComparator(
        directory.uri.resolve('comparator_test.dart'),
      );

      // One of 400 pixels differs: 0.25%, inside the 0.30% raster allowance.
      expect(
        await comparator.compare(
          _pngWithChangedPixels(1),
          Uri.parse('baseline.png'),
        ),
        isTrue,
      );

      // Two of 400 pixels differ: 0.50%, a material failure for this fixture.
      await expectLater(
        comparator.compare(_pngWithChangedPixels(2), Uri.parse('baseline.png')),
        throwsA(isA<FlutterError>()),
      );
    },
  );

  test('supports a separately reviewed corpus tolerance', () async {
    final directory = await Directory.systemTemp.createTemp(
      'catch-widgetbook-golden-comparator-',
    );
    addTearDown(() => directory.delete(recursive: true));

    await File(
      '${directory.path}/baseline.png',
    ).writeAsBytes(_pngWithChangedPixels(0));
    final comparator = CatchGoldenFileComparator(
      directory.uri.resolve('comparator_test.dart'),
      precisionTolerance: 0.006,
    );

    // Two of 400 pixels differ: 0.50%, inside the reviewed corpus allowance.
    expect(
      await comparator.compare(
        _pngWithChangedPixels(2),
        Uri.parse('baseline.png'),
      ),
      isTrue,
    );

    // Three of 400 pixels differ: 0.75%, still rejected.
    await expectLater(
      comparator.compare(_pngWithChangedPixels(3), Uri.parse('baseline.png')),
      throwsA(isA<FlutterError>()),
    );
  });

  test(
    'report mode records changed and missing baselines without failing',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'catch-golden-comparator-report-',
      );
      addTearDown(() => directory.delete(recursive: true));

      await File(
        '${directory.path}/baseline.png',
      ).writeAsBytes(_pngWithChangedPixels(0));
      final report = File('${directory.path}/report.tsv');
      final comparator = CatchGoldenFileComparator(
        directory.uri.resolve('comparator_test.dart'),
        reportPath: report.path,
      );

      // Inside tolerance: nothing reported.
      expect(
        await comparator.compare(
          _pngWithChangedPixels(1),
          Uri.parse('baseline.png'),
        ),
        isTrue,
      );
      expect(report.existsSync(), isFalse);

      // Two of 400 pixels differ: 0.50%, reported with diff images.
      expect(
        await comparator.compare(
          _pngWithChangedPixels(2),
          Uri.parse('baseline.png'),
        ),
        isTrue,
      );
      expect(
        File(
          '${directory.path}/failures/baseline_isolatedDiff.png',
        ).existsSync(),
        isTrue,
      );

      // No baseline yet: the render is kept for review.
      expect(
        await comparator.compare(
          _pngWithChangedPixels(0),
          Uri.parse('new.png'),
        ),
        isTrue,
      );
      expect(
        File('${directory.path}/failures/new_testImage.png').existsSync(),
        isTrue,
      );

      expect(report.readAsLinesSync(), [
        'baseline.png\t0.5000%\t0.30%',
        'new.png\tno baseline\t0.30%',
      ]);
    },
  );
}

Uint8List _pngWithChangedPixels(int count) {
  final canvas = image.Image(width: 20, height: 20);
  image.fill(canvas, color: image.ColorRgba8(0, 0, 0, 255));
  for (var index = 0; index < count; index += 1) {
    canvas.setPixel(index, 0, image.ColorRgba8(255, 255, 255, 255));
  }
  return Uint8List.fromList(image.encodePng(canvas));
}
