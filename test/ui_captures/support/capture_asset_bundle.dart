import 'dart:async';
import 'dart:io';

import 'package:flutter/painting.dart';
import 'package:flutter/services.dart';

/// Capture fixtures are test files, not assets shipped in the application.
/// Every other key keeps the normal bundle's behavior, including missing assets.
class CaptureAssetBundle extends CachingAssetBundle {
  CaptureAssetBundle({AssetBundle? fallback})
    : _fallback = fallback ?? rootBundle;

  final AssetBundle _fallback;

  static const _fixtureKeys = {
    'assets/fixtures/club_hero_portrait.jpg',
    'assets/fixtures/profile_portrait.jpg',
    'assets/fixtures/event_social_run.jpg',
    'assets/fixtures/event_rooftop_social.jpg',
    'assets/fixtures/event_dinner_table.jpg',
    'assets/fixtures/event_pickleball.jpg',
  };

  @override
  Future<ByteData> load(String key) async {
    if (_fixtureKeys.contains(key)) {
      return ByteData.sublistView(await File(key).readAsBytes());
    }
    return _fallback.load(key);
  }
}

/// A declared precache is required image evidence. Decode errors and timeouts
/// must fail the capture; deliberate fallback images should not be precached.
Future<void> warmCaptureImage(
  ImageProvider<Object> provider,
  AssetBundle bundle, {
  Duration timeout = const Duration(seconds: 2),
}) async {
  final completer = Completer<void>();
  final stream = provider.resolve(ImageConfiguration(bundle: bundle));
  final listener = ImageStreamListener(
    (image, synchronousCall) {
      image.dispose();
      if (!completer.isCompleted) completer.complete();
    },
    onError: (Object error, StackTrace? stack) {
      if (!completer.isCompleted) completer.completeError(error, stack);
    },
  );
  stream.addListener(listener);
  try {
    await completer.future.timeout(timeout);
  } finally {
    stream.removeListener(listener);
  }
}
