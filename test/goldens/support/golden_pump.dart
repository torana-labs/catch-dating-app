import 'dart:async';
import 'dart:io';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

const _catchGoldenRootKey = ValueKey<String>('catch-golden-root');
const _maximumGoldenPageHeight = 3000.0;

/// Decode a fixture before pumping. Asset image cache keys include the bundle,
/// so preload through the same bundle used by both themed frames.
Future<void> _warmImage(ImageProvider<Object> provider, AssetBundle bundle) {
  final completer = Completer<void>();
  final stream = provider.resolve(ImageConfiguration(bundle: bundle));
  late final ImageStreamListener listener;
  void done() {
    stream.removeListener(listener);
    if (!completer.isCompleted) completer.complete();
  }

  listener = ImageStreamListener(
    (image, sync) => done(),
    onError: (error, stack) {
      stream.removeListener(listener);
      if (!completer.isCompleted) completer.completeError(error, stack);
    },
  );
  stream.addListener(listener);
  return completer.future;
}

/// Pumps [builder] inside the real Catch theme on a fixed surface and asserts
/// the golden in BOTH light and dark: `baseline/<name>.light.png` and
/// `baseline/<name>.dark.png`. Use [textScale] for Dynamic-Type variants and
/// [precache] to warm image fixtures so photo-bearing goldens paint.
///
/// devicePixelRatio is pinned to 1.0 and the surface is fixed for crisp,
/// deterministic PNGs. Bundled app fonts are loaded by the suite's
/// `flutter_test_config.dart`, so font failures remain real test failures.
Future<void> matchCatchGolden(
  WidgetTester tester,
  String name, {
  required WidgetBuilder builder,
  double textScale = 1.0,
  Size size = const Size(440, 1220),
  List<ImageProvider<Object>> precache = const <ImageProvider<Object>>[],
  Key? fitContentKey,
  bool fitFirstScrollable = false,
}) async {
  tester.view.devicePixelRatio = 1.0;
  tester.view.physicalSize = size;
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  final assetBundle = _GoldenAssetBundle();

  if (precache.isNotEmpty) {
    await tester.runAsync(() async {
      for (final provider in precache) {
        await _warmImage(provider, assetBundle);
      }
    });
  }

  for (final brightness in Brightness.values) {
    tester.view.physicalSize = size;
    await tester.pumpWidget(
      _frame(brightness, textScale, builder, assetBundle),
    );
    await pumpFeatureUi(tester);
    if (fitContentKey != null || fitFirstScrollable) {
      final content = fitContentKey == null ? null : find.byKey(fitContentKey);
      final contentCount = content?.evaluate().length ?? 0;
      if (contentCount > 1) {
        throw StateError(
          'Expected at most one fit-content owner for $name; '
          'found $contentCount.',
        );
      }
      final scrollables = goldenVerticalScrollables(
        find.byKey(_catchGoldenRootKey),
      );
      if (contentCount > 0 ||
          (fitFirstScrollable && scrollables.evaluate().isNotEmpty)) {
        double fittedHeight() => contentCount > 0
            ? tester.getBottomRight(content!).dy
            : _scrollableContentBottom(tester, scrollables.first);
        final initialHeight = fittedHeight();
        if (initialHeight > _maximumGoldenPageHeight) {
          if (scrollables.evaluate().isEmpty) {
            throw StateError(
              'Golden $name needs a ${initialHeight.toStringAsFixed(1)}px '
              'surface without a scroll owner; split its catalog matrix.',
            );
          }
          tester.view.physicalSize = Size(size.width, _maximumGoldenPageHeight);
          await pumpFeatureUi(tester);
          final scrollable = scrollables.first;
          final position = tester.state<ScrollableState>(scrollable).position;
          final contentHeight = _scrollableContentBottom(tester, scrollable);
          final pageCount = (contentHeight / _maximumGoldenPageHeight).ceil();
          position.jumpTo(0);
          await tester.pump();
          final mode = brightness == Brightness.light ? 'light' : 'dark';
          for (var page = 0; page < pageCount; page += 1) {
            if (page > 0) {
              position.jumpTo(
                (page * _maximumGoldenPageHeight)
                    .clamp(0, position.maxScrollExtent)
                    .toDouble(),
              );
              await tester.pump();
            }
            await expectLater(
              find.byKey(_catchGoldenRootKey),
              matchesGoldenFile('baseline/$name.page-${page + 1}.$mode.png'),
            );
          }
          continue;
        }
        for (var pass = 0; pass < 2; pass += 1) {
          tester.view.physicalSize = Size(size.width, fittedHeight());
          await pumpFeatureUi(tester);
        }
      }
    }
    final mode = brightness == Brightness.light ? 'light' : 'dark';
    await expectLater(
      find.byKey(_catchGoldenRootKey),
      matchesGoldenFile('baseline/$name.$mode.png'),
    );
  }
}

/// Catalog fitting follows vertical page ownership, never a nested pane strip.
Finder goldenVerticalScrollables(Finder root) => find.descendant(
  of: root,
  matching: find.byWidgetPredicate(
    (widget) =>
        widget is Scrollable &&
        axisDirectionToAxis(widget.axisDirection) == Axis.vertical,
  ),
);

double _scrollableContentBottom(WidgetTester tester, Finder scrollable) {
  final position = tester.state<ScrollableState>(scrollable).position;
  if (position.axis != Axis.vertical) {
    throw StateError('Golden fit-content owner must scroll vertically.');
  }
  return tester.getTopLeft(scrollable).dy +
      position.viewportDimension +
      position.maxScrollExtent;
}

Widget _frame(
  Brightness brightness,
  double textScale,
  WidgetBuilder builder,
  AssetBundle assetBundle,
) {
  return DefaultAssetBundle(
    // Paused implicit animations cannot transition inherited Material text
    // between themes. A fresh app tree also isolates route and control state.
    key: ValueKey(brightness),
    bundle: assetBundle,
    child: MaterialApp(
      key: _catchGoldenRootKey,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: brightness == Brightness.dark
          ? ThemeMode.dark
          : ThemeMode.light,
      home: Builder(
        builder: (context) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
            disableAnimations: true,
          ),
          child: TickerMode(
            enabled: false,
            child: Scaffold(
              backgroundColor: Theme.of(context).scaffoldBackgroundColor,
              body: Builder(builder: builder),
            ),
          ),
        ),
      ),
    ),
  );
}

class _GoldenAssetBundle extends CachingAssetBundle {
  _GoldenAssetBundle()
    : _appRoot = File('lib/main.directories.g.dart').existsSync()
          ? Directory.current.parent
          : Directory.current;

  final Directory _appRoot;

  @override
  Future<ByteData> load(String key) async {
    final relative = key.startsWith('packages/catch_dating_app/')
        ? key.substring('packages/catch_dating_app/'.length)
        : key;
    final file = File('${_appRoot.path}/$relative');
    if (file.existsSync()) {
      return ByteData.sublistView(await file.readAsBytes());
    }
    return rootBundle.load(key);
  }
}
