import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';
import 'capture_asset_bundle.dart';
import 'capture_device.dart';

class CaptureTheme {
  const CaptureTheme(this.name, this.brightness);

  final String name;
  final Brightness brightness;

  static const light = CaptureTheme('light', Brightness.light);
  static const dark = CaptureTheme('dark', Brightness.dark);
  static const all = <CaptureTheme>[light, dark];
}

class CaptureArtifact {
  const CaptureArtifact({
    required this.id,
    required this.theme,
    required this.file,
  });

  final String id;
  final CaptureTheme theme;
  final File file;
}

enum CaptureOutputLayout {
  captureFirst,
  themeFirst;

  static CaptureOutputLayout fromName(String name) => switch (name) {
    'capture-first' || '' => CaptureOutputLayout.captureFirst,
    'theme-first' => CaptureOutputLayout.themeFirst,
    _ => throw ArgumentError.value(
      name,
      'name',
      'Unknown capture output layout.',
    ),
  };
}

Future<List<CaptureArtifact>> captureCatchWidget(
  WidgetTester tester, {
  required String id,
  required WidgetBuilder builder,
  required Directory outputDirectory,
  Future<void> Function(WidgetTester tester)? drive,
  Future<void> Function(WidgetTester tester)? cleanup,
  CaptureDevice device = CaptureDevice.reviewPhone,
  double pixelRatio = 1.0,
  double textScale = 1.0,
  bool disableAnimations = false,
  bool includeOverlays = false,
  CaptureOutputLayout outputLayout = CaptureOutputLayout.captureFirst,
  List<CaptureTheme> themes = CaptureTheme.all,
  List<ImageProvider<Object>> precache = const <ImageProvider<Object>>[],
  Iterable providerOverrides = const [],
}) async {
  tester.view.devicePixelRatio = device.devicePixelRatio;
  tester.view.physicalSize = device.size;
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);

  final assetBundle = CaptureAssetBundle();
  if (precache.isNotEmpty) {
    // runAsync reports uncaught errors to the test binding and returns null.
    // Carry failures back explicitly so a failed required image stops export.
    Object? warmupError;
    StackTrace? warmupStack;
    await tester.runAsync(() async {
      try {
        for (final provider in precache) {
          await warmCaptureImage(provider, assetBundle);
        }
      } catch (error, stack) {
        warmupError = error;
        warmupStack = stack;
      }
    });
    if (warmupError != null) {
      Error.throwWithStackTrace(warmupError!, warmupStack!);
    }
  }

  final artifacts = <CaptureArtifact>[];

  for (final theme in themes) {
    final boundaryKey = GlobalKey();
    await tester.pumpWidget(
      _frame(
        assetBundle: assetBundle,
        boundaryKey: boundaryKey,
        brightness: theme.brightness,
        textScale: textScale,
        disableAnimations: disableAnimations,
        includeOverlays: includeOverlays,
        device: device,
        builder: builder,
        providerOverrides: providerOverrides,
      ),
    );
    await _pumpCaptureFrame(tester);
    if (includeOverlays) {
      await pumpFeatureUi(tester);
    }
    if (drive != null) {
      await drive(tester);
      await _pumpCaptureFrame(tester);
    }

    final file = _captureFile(
      outputDirectory: outputDirectory,
      id: id,
      theme: theme,
      layout: outputLayout,
    );
    await tester.runAsync(
      () => _writeBoundaryPng(boundaryKey, file, pixelRatio: pixelRatio),
    );
    artifacts.add(CaptureArtifact(id: id, theme: theme, file: file));
    if (cleanup != null) {
      await cleanup(tester);
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 50));
    }
  }

  await pumpFeatureUiFor(tester, const Duration(milliseconds: 50));
  return artifacts;
}

File _captureFile({
  required Directory outputDirectory,
  required String id,
  required CaptureTheme theme,
  required CaptureOutputLayout layout,
}) {
  return switch (layout) {
    CaptureOutputLayout.captureFirst => File(
      '${outputDirectory.path}/$id/${theme.name}.png',
    ),
    CaptureOutputLayout.themeFirst => File(
      '${outputDirectory.path}/${theme.name}/$id.png',
    ),
  };
}

Future<void> _pumpCaptureFrame(WidgetTester tester) async {
  await tester.pump();
  await pumpFeatureUiFor(tester, const Duration(milliseconds: 100));
  await pumpFeatureUiFor(tester, const Duration(milliseconds: 250));
  // MaterialApp's theme transition can finish on the same frame that a nested
  // implicit surface animation receives its final dark-theme target. Give that
  // second-order animation one bounded beat so dark captures record the settled
  // token colors instead of a light/dark midpoint.
  await pumpFeatureUiFor(tester, CatchMotion.base);
}

Future<void> _writeBoundaryPng(
  GlobalKey key,
  File file, {
  required double pixelRatio,
}) async {
  final boundary =
      key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  final image = await boundary.toImage(pixelRatio: pixelRatio);
  final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();

  if (bytes == null) {
    throw StateError('Failed to encode ${file.path} as PNG.');
  }

  await file.create(recursive: true);
  await file.writeAsBytes(bytes.buffer.asUint8List(), flush: true);
}

Widget _frame({
  required CaptureAssetBundle assetBundle,
  required GlobalKey boundaryKey,
  required Brightness brightness,
  required double textScale,
  required bool disableAnimations,
  required bool includeOverlays,
  required CaptureDevice device,
  required WidgetBuilder builder,
  required Iterable providerOverrides,
}) {
  final app = ProviderScope(
    overrides: [...providerOverrides],
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      theme: _captureTheme(AppTheme.light),
      darkTheme: _captureTheme(AppTheme.dark),
      themeMode: brightness == Brightness.dark
          ? ThemeMode.dark
          : ThemeMode.light,
      builder: includeOverlays
          ? (context, child) => MediaQuery(
              data: _captureMediaQuery(
                MediaQuery.of(context),
                brightness: brightness,
                device: device,
                textScale: textScale,
                disableAnimations: disableAnimations,
              ),
              child: _withStatusBar(
                device,
                brightness,
                child ?? const SizedBox.shrink(),
              ),
            )
          : null,
      home: includeOverlays
          ? _captureScaffold(builder)
          : RepaintBoundary(
              key: boundaryKey,
              child: Builder(
                builder: (context) => MediaQuery(
                  data: _captureMediaQuery(
                    MediaQuery.of(context),
                    brightness: brightness,
                    device: device,
                    textScale: textScale,
                    disableAnimations: disableAnimations,
                  ),
                  child: _withStatusBar(
                    device,
                    brightness,
                    _captureScaffold(builder),
                  ),
                ),
              ),
            ),
    ),
  );

  final bundledApp = DefaultAssetBundle(bundle: assetBundle, child: app);
  return includeOverlays
      ? RepaintBoundary(key: boundaryKey, child: bundledApp)
      : bundledApp;
}

/// Lays a clean status bar over the top safe area for devices that show one,
/// so marketing captures read as a phone screen rather than a blank inset.
Widget _withStatusBar(CaptureDevice device, Brightness brightness, Widget app) {
  if (!device.showsStatusBar || device.safeArea.top <= 0) return app;
  return Stack(
    textDirection: TextDirection.ltr,
    children: [
      Positioned.fill(child: app),
      Positioned(
        top: 0,
        left: 0,
        right: 0,
        height: device.safeArea.top,
        child: CaptureStatusBar(
          color: brightness == Brightness.dark
              ? const Color(0xFFFFFFFF)
              : const Color(0xFF000000),
        ),
      ),
    ],
  );
}

/// 9:41 with full signal, Wi-Fi and battery, in the layout the web captures'
/// Safari screen uses (tool/marketing/lib/web_capture_screen.mjs): the time
/// centred in the leading 138pt, the icons centred in the trailing 138pt.
class CaptureStatusBar extends StatelessWidget {
  const CaptureStatusBar({super.key, required this.color});

  static const time = '9:41';

  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Semantics(
        excludeSemantics: true,
        child: Align(
          alignment: Alignment.topCenter,
          child: Padding(
            padding: const EdgeInsets.only(top: 19),
            child: SizedBox(
              height: 22,
              child: Row(
                children: [
                  SizedBox(
                    width: 138,
                    child: Center(
                      child: Text(
                        time,
                        textDirection: TextDirection.ltr,
                        textScaler: TextScaler.noScaling,
                        style: TextStyle(
                          color: color,
                          fontFamily: CatchFonts.functionFamily,
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.2,
                          height: 1.25,
                          decoration: TextDecoration.none,
                        ),
                      ),
                    ),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: 138,
                    child: Center(
                      child: CustomPaint(
                        size: const Size(73, 13),
                        painter: _StatusIconsPainter(color),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Signal (18x12), Wi-Fi (16x12) and battery (27x13), 6pt apart.
class _StatusIconsPainter extends CustomPainter {
  const _StatusIconsPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final fill = Paint()..color = color;
    // Signal: four rising bars, all lit.
    const bars = [(0.0, 8.0), (5.0, 5.5), (10.0, 3.0), (15.0, 0.0)];
    for (final (x, top) in bars) {
      canvas.drawRRect(
        RRect.fromLTRBR(x, top + 0.5, x + 3, 12.5, const Radius.circular(1)),
        fill,
      );
    }
    // Wi-Fi: three arcs and a dot, all lit.
    const wifiCentre = Offset(24 + 8, 12);
    final arc = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.9
      ..strokeCap = StrokeCap.round;
    for (final radius in [10.0, 6.6]) {
      canvas.drawArc(
        Rect.fromCircle(center: wifiCentre, radius: radius),
        -2.36,
        1.57,
        false,
        arc,
      );
    }
    canvas.drawPath(
      Path()
        ..moveTo(wifiCentre.dx, wifiCentre.dy)
        ..arcTo(
          Rect.fromCircle(center: wifiCentre, radius: 3.6),
          -2.36,
          1.57,
          false,
        )
        ..close(),
      fill,
    );
    // Battery: outline, full charge and the terminal nub.
    const left = 46.0;
    final faint = color.withValues(alpha: 0.4);
    canvas.drawRRect(
      RRect.fromLTRBR(
        left + 0.5,
        0.5,
        left + 23.5,
        12.5,
        const Radius.circular(3.8),
      ),
      Paint()
        ..color = faint
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
    canvas.drawRRect(
      RRect.fromLTRBR(left + 2, 2, left + 22, 11, const Radius.circular(2.5)),
      fill,
    );
    canvas.drawRRect(
      RRect.fromLTRBR(
        left + 25,
        4.5,
        left + 26.4,
        8.5,
        const Radius.circular(0.7),
      ),
      Paint()..color = faint,
    );
  }

  @override
  bool shouldRepaint(_StatusIconsPainter oldDelegate) =>
      oldDelegate.color != color;
}

Widget _captureScaffold(WidgetBuilder builder) {
  return Builder(
    builder: (context) => Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Builder(builder: builder),
    ),
  );
}

ThemeData _captureTheme(ThemeData theme) {
  return theme.copyWith(
    textTheme: theme.textTheme.apply(fontFamily: CatchFonts.functionFamily),
    primaryTextTheme: theme.primaryTextTheme.apply(
      fontFamily: CatchFonts.functionFamily,
    ),
  );
}

MediaQueryData _captureMediaQuery(
  MediaQueryData data, {
  required Brightness brightness,
  required CaptureDevice device,
  required double textScale,
  required bool disableAnimations,
}) {
  // The phone's dark-mode setting, which a system CatchRoot follows.
  return data.copyWith(
    platformBrightness: brightness,
    padding: device.safeArea,
    viewPadding: device.safeArea,
    textScaler: TextScaler.linear(textScale),
    disableAnimations: disableAnimations,
  );
}
