import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';

const _body = ValueKey('first-body-element');
const _rail = ValueKey('primary-rail');
const _offline = ValueKey('status_strip.offline');
const _rehearsal = ValueKey('status_strip.rehearsal');
const _capture = ValueKey('capture');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      for (final tabbed in [false, true]) {
        testWidgets(
          'pinned status below title/rail dark=$dark scale=$scale tabbed=$tabbed',
          (tester) async {
            _size(tester);
            final controller = ScrollController();
            addTearDown(controller.dispose);
            await tester.pumpWidget(
              _app(
                dark: dark,
                scale: scale,
                tabbed: tabbed,
                controller: controller,
              ),
            );
            await tester.pump();
            final rehearsal = tester.getRect(find.byKey(_rehearsal));
            final offline = tester.getRect(find.byKey(_offline));
            expect(offline.top, rehearsal.bottom);
            for (final (key, label) in [
              (_rehearsal, 'REHEARSAL'),
              (_offline, "YOU'RE OFFLINE"),
            ]) {
              final band = tester.widget<Semantics>(find.byKey(key));
              final background =
                  ((band.child! as DecoratedBox).decoration as BoxDecoration)
                      .color!;
              final foreground = tester
                  .widget<Text>(find.text(label))
                  .style!
                  .color!;
              final first = foreground.computeLuminance() + 0.05;
              final second = background.computeLuminance() + 0.05;
              expect(
                first > second ? first / second : second / first,
                greaterThanOrEqualTo(4.5),
              );
            }
            expect(
              tester.getTopLeft(find.byKey(_body)).dy - offline.bottom,
              16,
            );
            expect(tester.getTopLeft(find.byKey(_body)).dx, 20);
            if (tabbed) {
              final rail = tester.getRect(find.byKey(_rail));
              expect(rehearsal.top, rail.bottom);
              expect(
                rail.height,
                CatchPageTabBar.heightFor(tester.element(find.byKey(_rail))),
              );
            }
            expect(tester.takeException(), isNull);
            await _captureIfRequested(
              tester,
              'status-${tabbed ? 'tabbed' : 'root'}-${dark ? 'dark' : 'light'}-$scale-top',
            );

            controller.jumpTo(controller.position.maxScrollExtent);
            await tester.pump();
            final expectedTop = tabbed
                ? 59.0 + tester.getSize(find.byKey(_rail)).height
                : 59.0;
            expect(tester.getTopLeft(find.byKey(_rehearsal)).dy, expectedTop);
            expect(
              tester.getTopLeft(find.byKey(_offline)).dy,
              expectedTop + rehearsal.height,
            );
            if (tabbed) expect(tester.getTopLeft(find.byKey(_rail)).dy, 59);
            expect(tester.takeException(), isNull);
            await _captureIfRequested(
              tester,
              'status-${tabbed ? 'tabbed' : 'root'}-${dark ? 'dark' : 'light'}-$scale-scrolled',
            );
          },
        );
      }
    }
  }

  testWidgets(
    'connectivity changes recalculate overlap, preserve tab state and clear nested scope',
    (tester) async {
      _size(tester);
      final online = ValueNotifier(false);
      addTearDown(online.dispose);
      final outer = ScrollController();
      addTearDown(outer.dispose);
      await tester.pumpWidget(
        ValueListenableBuilder<bool>(
          valueListenable: online,
          builder: (context, value, _) =>
              _app(offline: !value, controller: outer),
        ),
      );
      await tester.pump();
      final first = tester.getTopLeft(find.byKey(_body)).dy;
      final offlineHeight = tester.getSize(find.byKey(_offline)).height;
      online.value = true;
      await tester.pump();
      expect(find.byKey(_offline), findsNothing);
      expect(
        tester.getTopLeft(find.byKey(_body)).dy,
        closeTo(first - offlineHeight, .01),
      );
      final bodyContext = tester.element(find.byKey(_body));
      expect(CatchBannerStatusScope.of(bodyContext), isEmpty);

      outer.jumpTo(outer.position.maxScrollExtent);
      await tester.pump();
      online.value = false;
      await tester.pump();
      expect(tester.getTopLeft(find.byKey(_rail)).dy, 59);
      expect(
        tester.getTopLeft(find.byKey(_rehearsal)).dy,
        tester.getBottomLeft(find.byKey(_rail)).dy,
      );
      await tester.tap(find.text('Insights'));
      await pumpFeatureUi(tester);
      expect(find.byKey(_offline), findsOneWidget);
      expect(
        tester.getTopLeft(find.byKey(_rehearsal)).dy,
        tester.getBottomLeft(find.byKey(_rail)).dy,
      );
      expect(tester.takeException(), isNull);
    },
    variant: const TargetPlatformVariant({
      TargetPlatform.iOS,
      TargetPlatform.android,
    }),
  );

  testWidgets(
    'pushed route places local context before global offline below app bar',
    (tester) async {
      _size(tester);
      var clockOpened = 0;
      var toolsOpened = 0;
      final controller = ScrollController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        _app(
          pushed: true,
          controller: controller,
          onClock: () => clockOpened++,
          onTools: () => toolsOpened++,
        ),
      );
      await tester.pump();
      final topBar = tester.getRect(find.byType(CatchTopBar));
      expect(tester.getTopLeft(find.byKey(_rehearsal)).dy, topBar.bottom);
      expect(
        tester.getTopLeft(find.byKey(_body)).dy,
        tester.getBottomLeft(find.byKey(_offline)).dy + 16,
      );
      await tester.tap(find.text('Virtual 5:00 PM'));
      await tester.tap(find.byTooltip('Practice tools'));
      expect(clockOpened, 1);
      expect(toolsOpened, 1);
      controller.jumpTo(200);
      await tester.pump();
      expect(tester.getTopLeft(find.byKey(_rehearsal)).dy, topBar.bottom);
      expect(tester.takeException(), isNull);
      expect(
        tester.widget<CatchTopBar>(find.byType(CatchTopBar)).emphasis,
        CatchTopBarEmphasis.divided,
      );
    },
  );

  testWidgets('narrow large text wraps copy and keeps both actions reachable', (
    tester,
  ) async {
    _size(tester, width: 320);
    await tester.pumpWidget(_app(scale: 2));
    await tester.pump();
    for (final label in [
      'REHEARSAL',
      'Synthetic guests',
      "YOU'RE OFFLINE",
      'Some content may be out of date.',
      'Virtual 5:00 PM',
    ]) {
      final text = tester.widget<Text>(find.text(label));
      if (label != 'Virtual 5:00 PM') expect(text.maxLines, isNull);
      expect(tester.getRect(find.text(label)).right, lessThanOrEqualTo(300));
    }
    expect(find.byTooltip('Practice tools').hitTestable(), findsOneWidget);
    expect(find.text('Virtual 5:00 PM').hitTestable(), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('edge-owned root header cannot pin status behind system chrome', (
    tester,
  ) async {
    _size(tester);
    final controller = ScrollController();
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      _app(tabbed: false, headerOwned: true, controller: controller),
    );
    controller.jumpTo(controller.position.maxScrollExtent);
    await tester.pump();
    expect(tester.getTopLeft(find.byKey(_rehearsal)).dy, 59);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'floating navigation obstruction is unchanged by persistent status',
    (tester) async {
      _size(tester);
      await tester.pumpWidget(
        CatchTabViewportScope(
          index: 0,
          bottomBarPlacement: CatchTabViewportScopePlacement.floating,
          bottomOverlayInset: 96,
          child: _app(),
        ),
      );
      expect(
        tester
            .widget<CatchFieldVisibilityScope>(
              find.byType(CatchFieldVisibilityScope),
            )
            .bottomObstruction,
        96,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('standalone status changes preserve the focused editor', (
    tester,
  ) async {
    final offline = ValueNotifier(false);
    addTearDown(offline.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: ValueListenableBuilder<bool>(
          valueListenable: offline,
          builder: (context, value, _) => CatchBannerStatusScope(
            statuses: [
              if (value)
                CatchBannerStatus(
                  id: 'offline',
                  label: 'Offline',
                  message: 'Reconnect to refresh.',
                  icon: CatchIcons.offline,
                  color: CatchTokens.of(context).warning,
                ),
            ],
            child: const CatchScaffold.standalone(
              body: TextField(autofocus: true),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.enterText(find.byType(TextField), 'Keep this draft');
    for (final value in [true, false]) {
      offline.value = value;
      await tester.pump();
      expect(find.text('Keep this draft'), findsOneWidget);
      expect(
        tester
            .widget<EditableText>(find.byType(EditableText))
            .focusNode
            .hasFocus,
        isTrue,
      );
    }
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}

void _size(WidgetTester tester, {double width = 390}) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, 844);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
}

Widget _app({
  bool dark = false,
  double scale = 1,
  bool tabbed = true,
  bool pushed = false,
  bool offline = true,
  bool headerOwned = false,
  ScrollController? controller,
  VoidCallback? onClock,
  VoidCallback? onTools,
}) {
  return MaterialApp(
    theme: dark ? AppTheme.dark : AppTheme.light,
    home: Builder(
      builder: (context) {
        final t = CatchTokens.of(context);
        final global = [
          if (offline)
            CatchBannerStatus(
              id: 'offline',
              label: "You're offline",
              message: 'Some content may be out of date.',
              icon: CatchIcons.offline,
              color: t.warning,
            ),
        ];
        final local = [
          CatchBannerStatus(
            id: 'rehearsal',
            label: 'Rehearsal',
            message: 'Synthetic guests',
            icon: CatchIcons.people,
            color: t.danger,
            actions: [
              CatchBannerAction(
                label: 'Virtual 5:00 PM',
                onPressed: onClock ?? () {},
              ),
              CatchBannerAction(
                label: 'Practice tools',
                icon: CatchIcons.more,
                onPressed: onTools ?? () {},
              ),
            ],
          ),
        ];
        const slivers = [
          SliverToBoxAdapter(
            child: SizedBox(
              key: _body,
              height: 1300,
              child: Text('Body content'),
            ),
          ),
        ];
        return RepaintBoundary(
          key: _capture,
          child: MediaQuery(
            data: MediaQuery.of(context).copyWith(
              padding: const EdgeInsets.only(top: 59, bottom: 34),
              textScaler: TextScaler.linear(scale),
            ),
            child: CatchBannerStatusScope(
              statuses: [if (!pushed) ...local, ...global],
              child: pushed
                  ? CatchRouteScaffold(
                      statuses: local,
                      topBarBuilder: (context, scrolled) => CatchTopBar.route(
                        title: 'Dress rehearsal',
                        emphasis: (scrolled)
                            ? CatchTopBarEmphasis.divided
                            : CatchTopBarEmphasis.plain,
                      ),
                      body: CatchRouteBody.standardSlivers(
                        slivers: slivers,
                        controller: controller,
                      ),
                    )
                  : tabbed
                  ? DefaultTabController(
                      length: 2,
                      child: Builder(
                        builder: (context) {
                          final tabs = DefaultTabController.of(context);
                          return CatchRootScreenScaffold.withPrimaryRail(
                            header: const CatchRootScreenHeader.title(
                              title: 'Organizer',
                            ),
                            controller: controller,
                            actions: CatchPageTabBar<int>.controlled(
                              key: _rail,
                              controller: tabs,
                              options: const [
                                CatchOption(value: 0, label: 'Edit'),
                                CatchOption(value: 1, label: 'Insights'),
                              ],
                            ),
                            body: CatchRootScreenBody.paged(
                              controller: tabs,
                              pages: [
                                for (var i = 0; i < 2; i++)
                                  CatchRootScreenPageSpec.scroll(
                                    page:
                                        CatchRootScreenPageScrollView.standard(
                                          scrollKey: PageStorageKey('page-$i'),
                                          children: slivers,
                                        ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    )
                  : CatchRootScreenScaffold.standard(
                      title: const CatchTopBar.primaryRail(title: 'Today'),
                      controller: controller,
                      topEdge: headerOwned
                          ? CatchRootScreenScrollViewPlacement.headerOwned
                          : CatchRootScreenScrollViewPlacement.safeArea,
                      children: slivers,
                    ),
            ),
          ),
        );
      },
    ),
  );
}

Future<void> _captureIfRequested(WidgetTester tester, String name) async {
  final path = Platform.environment['CATCH_STATUS_CAPTURE_DIR'];
  if (path == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(_capture),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory(path).create(recursive: true);
    await File('$path/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}
