import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/capture_device.dart';

class ScreenCaptureEntry {
  const ScreenCaptureEntry({
    required this.id,
    required this.routeIds,
    required this.device,
    required this.builder,
    this.precache = const <ImageProvider<Object>>[],
    this.marketingFixtureKeys = const <String>[],
    this.providerOverrides = const [],
    this.textScale = 1.0,
    this.disableAnimations = false,
    this.includeOverlays = false,
    this.drive,
    this.cleanup,
  });

  final String id;
  final List<String> routeIds;
  final CaptureDevice device;
  final WidgetBuilder builder;
  final List<ImageProvider<Object>> precache;
  final List<String> marketingFixtureKeys;
  final Iterable providerOverrides;
  final double textScale;
  final bool disableAnimations;
  final bool includeOverlays;
  final Future<void> Function(WidgetTester tester)? drive;
  final Future<void> Function(WidgetTester tester)? cleanup;
}
