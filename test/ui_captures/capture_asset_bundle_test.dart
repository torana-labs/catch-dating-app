import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'support/capture_asset_bundle.dart';
import 'support/capture_pump.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final key in [
    'assets/fixtures/profile_portrait.jpg',
    'assets/fixtures/club_hero_portrait.jpg',
    'assets/fixtures/event_social_run.jpg',
    'assets/fixtures/event_rooftop_social.jpg',
    'assets/fixtures/event_dinner_table.jpg',
    'assets/fixtures/event_pickleball.jpg',
  ]) {
    testWidgets('capture fixture decodes actual pixels: $key', (tester) async {
      await tester.runAsync(() async {
        final fallback = _RecordingBundle();
        final bytes = await CaptureAssetBundle(fallback: fallback).load(key);
        final codec = await ui.instantiateImageCodec(
          bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes),
        );
        try {
          final frame = await codec.getNextFrame();
          expect(frame.image.width, greaterThan(1));
          expect(frame.image.height, greaterThan(1));
          frame.image.dispose();
          expect(fallback.keys, isEmpty);
        } finally {
          codec.dispose();
        }
      });
    });
  }

  test('only exact fixture keys bypass the normal bundle', () async {
    final fallback = _RecordingBundle();
    final bundle = CaptureAssetBundle(fallback: fallback);
    const keys = [
      'assets/branding/catch_icon.png',
      'test/goldens/fixtures/portrait.jpg',
      'assets/fixtures/../fixtures/profile_portrait.jpg',
      'assets/fixtures/missing.jpg',
      'AssetManifest.bin',
    ];
    for (final key in keys) {
      expect(await bundle.load(key), same(fallback.bytes));
    }
    expect(fallback.keys, keys);
  });

  testWidgets('normal assets still load from rootBundle', (tester) async {
    await tester.runAsync(() async {
      final actual = await CaptureAssetBundle().load(
        'assets/branding/catch_icon.png',
      );
      final expected = await rootBundle.load('assets/branding/catch_icon.png');
      expect(
        actual.buffer.asUint8List(actual.offsetInBytes, actual.lengthInBytes),
        expected.buffer.asUint8List(
          expected.offsetInBytes,
          expected.lengthInBytes,
        ),
      );
    });
  });

  testWidgets('warmup and both rendered themes decode the same fixture', (
    tester,
  ) async {
    final output = Directory.systemTemp.createTempSync('catch-capture-assets-');
    addTearDown(() => output.deleteSync(recursive: true));
    const key = 'assets/fixtures/profile_portrait.jpg';
    final observedBundles = <AssetBundle>[];
    var decodedFrames = 0;
    final artifacts = await captureCatchWidget(
      tester,
      id: 'portrait',
      outputDirectory: output,
      precache: const [AssetImage(key)],
      builder: (context) {
        observedBundles.add(DefaultAssetBundle.of(context));
        return Image.asset(
          key,
          errorBuilder: (_, _, _) => const Text('fallback'),
        );
      },
      drive: (tester) async {
        expect(find.text('fallback'), findsNothing);
        final image = tester.widget<RawImage>(find.byType(RawImage)).image;
        expect(image, isNotNull);
        expect(image!.width, greaterThan(1));
        decodedFrames++;
      },
    );
    expect(decodedFrames, 2);
    expect(artifacts, hasLength(2));
    expect(observedBundles, isNotEmpty);
    expect(
      observedBundles.every(
        (bundle) => identical(bundle, observedBundles.first),
      ),
      isTrue,
    );
    expect(observedBundles.first, isA<CaptureAssetBundle>());
    expect(tester.takeException(), isNull);
  });

  testWidgets('a required corrupt precache stops before builder or export', (
    tester,
  ) async {
    final output = Directory.systemTemp.createTempSync(
      'catch-capture-invalid-',
    );
    addTearDown(() => output.deleteSync(recursive: true));
    var built = false;
    await expectLater(
      captureCatchWidget(
        tester,
        id: 'must-not-export',
        outputDirectory: output,
        precache: [
          MemoryImage(Uint8List.fromList([1, 2, 3])),
        ],
        builder: (_) {
          built = true;
          return const Text('incorrect success');
        },
      ),
      throwsA(anything),
    );
    expect(built, isFalse);
    expect(output.listSync(), isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('unresolved required precache reports timeout', (tester) async {
    await tester.runAsync(() async {
      await expectLater(
        warmCaptureImage(
          const AssetImage('unresolved-fixture'),
          _NeverBundle(),
          timeout: const Duration(milliseconds: 10),
        ),
        throwsA(isA<TimeoutException>()),
      );
    });
  });

  testWidgets('deliberate missing image keeps its rendered fallback', (
    tester,
  ) async {
    final output = Directory.systemTemp.createTempSync(
      'catch-capture-fallback-',
    );
    addTearDown(() => output.deleteSync(recursive: true));
    var fallbackFrames = 0;
    late AssetBundle renderedBundle;
    final artifacts = await captureCatchWidget(
      tester,
      id: 'missing-photo',
      outputDirectory: output,
      builder: (context) {
        renderedBundle = DefaultAssetBundle.of(context);
        return Image.asset(
          'assets/fixtures/intentionally-absent.jpg',
          errorBuilder: (_, _, _) => const Text('Photo unavailable'),
        );
      },
      drive: (tester) async {
        // Observe the actual asset failure before pumping its fallback frame;
        // do not assume filesystem delivery completes within a fixed sleep.
        await tester.runAsync(() async {
          await expectLater(
            warmCaptureImage(
              const AssetImage('assets/fixtures/intentionally-absent.jpg'),
              renderedBundle,
            ),
            throwsA(isA<FlutterError>()),
          );
        });
        await pumpUntilFound(tester, find.text('Photo unavailable'));
        expect(find.text('Photo unavailable'), findsOneWidget);
        fallbackFrames++;
      },
    );
    expect(fallbackFrames, 2);
    expect(artifacts, hasLength(2));
    expect(tester.takeException(), isNull);
  });
}

class _RecordingBundle extends CachingAssetBundle {
  final keys = <String>[];
  final bytes = ByteData(1);

  @override
  Future<ByteData> load(String key) async {
    keys.add(key);
    return bytes;
  }
}

class _NeverBundle extends CachingAssetBundle {
  @override
  Future<ByteData> load(String key) => Completer<ByteData>().future;
}
