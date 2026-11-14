import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

import 'catalog/screen_capture_catalog.dart';
import 'support/capture_device.dart';
import 'support/capture_pump.dart';

const _defaultCaptureIds = 'profile_self';
const _captureIdsArg = String.fromEnvironment(
  'CAPTURE_IDS',
  defaultValue: _defaultCaptureIds,
);
const _outputDirArg = String.fromEnvironment(
  'CAPTURE_OUTPUT_DIR',
  defaultValue: 'artifacts/ui-captures/review',
);
const _platformArg = String.fromEnvironment('CAPTURE_PLATFORM');
const _deviceIdArg = String.fromEnvironment('CAPTURE_DEVICE_ID');
const _textScaleArg = String.fromEnvironment('CAPTURE_TEXT_SCALE');
const _pixelRatioArg = String.fromEnvironment(
  'CAPTURE_DPR',
  defaultValue: '1.0',
);
const _outputLayoutArg = String.fromEnvironment(
  'CAPTURE_OUTPUT_LAYOUT',
  defaultValue: 'capture-first',
);

void main() {
  // The environment wins over the dart-define, so solo renders of different
  // captures share one compiled test (identical defines) instead of
  // recompiling for each id.
  final captureIds = (Platform.environment['CAPTURE_IDS'] ?? _captureIdsArg)
      .split(',')
      .map((id) => id.trim())
      .where((id) => id.isNotEmpty)
      .toList(growable: false);
  final outputDirectory = Directory(_outputDirArg);
  final textScaleOverride = double.tryParse(_textScaleArg);
  final pixelRatio = double.tryParse(_pixelRatioArg) ?? 1.0;
  final outputLayout = CaptureOutputLayout.fromName(_outputLayoutArg);

  final TestVariant<Object?> platformVariant = switch (_platformArg) {
    '' => const DefaultTestVariant(),
    'ios' => TargetPlatformVariant.only(TargetPlatform.iOS),
    'android' => TargetPlatformVariant.only(TargetPlatform.android),
    _ => throw ArgumentError.value(_platformArg, 'CAPTURE_PLATFORM'),
  };

  for (final captureId in captureIds) {
    testWidgets('captures $captureId', (tester) async {
      final entry = findScreenCapture(captureId);
      final device = _deviceIdArg.isEmpty
          ? entry.device
          : CaptureDevice.fromId(_deviceIdArg);
      final artifacts = await captureCatchWidget(
        tester,
        id: entry.id,
        builder: entry.builder,
        drive: entry.drive,
        cleanup: entry.cleanup,
        device: device,
        pixelRatio: pixelRatio,
        textScale: textScaleOverride ?? entry.textScale,
        disableAnimations: entry.disableAnimations,
        includeOverlays: entry.includeOverlays,
        outputLayout: outputLayout,
        outputDirectory: outputDirectory,
        precache: entry.precache,
        providerOverrides: entry.providerOverrides,
      );

      for (final artifact in artifacts) {
        expect(artifact.file.existsSync(), isTrue);
        expect(artifact.file.lengthSync(), greaterThan(0));
      }
    }, variant: platformVariant);
  }
}
